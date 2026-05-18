let inputArchivo;
let botonGuardar;
let inputClock;   
let inputOffset;  
let inputChroma;  
let audioContext;
let audioBuffer;
let imgFinal; 
let estadoMensaje = "Selecciona tu archivo PD120 (.wav)";

let imgWidth = 640;
let imgHeight = 496;

let canalAudio;
let totalMuestras = 0;
let sRate = 48000;
let indiceMuestra = 0;
let lastZeroCrossSample = 0;
let lineSyncFound = false;
let intervaloProcesado;

let currentLine = 0; 
let muestrasPorPixelBase = 0;
let muestraUltimoSync = 0;

// Almacena el nombre original del WAV cargado
let nombreArchivoOriginal = "sstv_captura";

let bufferY0 = new Float32Array(640);
let bufferY1 = new Float32Array(640);
let bufferU  = new Float32Array(640);
let bufferV  = new Float32Array(640);

function setup() {
  createCanvas(windowWidth, windowHeight);
  noSmooth();
  pixelDensity(1);
  
  imgFinal = createImage(imgWidth, imgHeight);
  limpiarImagenNegro();

  let margenX = 20;
  let pasoY = 55;

  // 1. Entrada de archivo WAV
  inputArchivo = createFileInput(procesarArchivoAudio);
  inputArchivo.style('position', 'absolute');
  inputArchivo.position(margenX, 20);
  inputArchivo.style('background-color', '#000');
  inputArchivo.style('color', '#fff');
  inputArchivo.style('padding', '5px');
  inputArchivo.style('border', 'none');
  inputArchivo.size(180);

  // 2. Caja de Texto para el Reloj
  inputClock = createInput('1.0');
  inputClock.style('position', 'absolute');
  inputClock.position(margenX, 20 + pasoY * 1);
  inputClock.size(60);
  inputClock.input(() => { if (audioBuffer) decodificarSSTV(); });

  // 3. Caja de Texto para el Desfase
  inputOffset = createInput('1050');
  inputOffset.style('position', 'absolute');
  inputOffset.position(margenX, 20 + pasoY * 2);
  inputOffset.size(60);
  inputOffset.input(() => { if (audioBuffer) decodificarSSTV(); });

  // 4. Caja de Texto para el Balance de Color
  inputChroma = createInput('1.0');
  inputChroma.style('position', 'absolute');
  inputChroma.position(margenX, 20 + pasoY * 3);
  inputChroma.size(60);
  inputChroma.input(() => { if (audioBuffer) decodificarSSTV(); });

  // 5. Botón para guardar la imagen PNG
  botonGuardar = createButton('DESCARGAR IMG');
  botonGuardar.style('position', 'absolute');
  botonGuardar.position(margenX, 20 + pasoY * 4 + 10);
  botonGuardar.style('background-color', '#333333');
  botonGuardar.style('color', '#fff');
  botonGuardar.style('padding', '6px 12px');
  botonGuardar.style('border', 'none');
  botonGuardar.style('cursor', 'pointer');
  botonGuardar.mousePressed(guardarImagenSSTV);
}



function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  let margenX = 20;
  let pasoY = 55;

  inputArchivo.position(margenX, 20);
  inputClock.position(margenX, 20 + pasoY * 1);
  inputOffset.position(margenX, 20 + pasoY * 2);
  inputChroma.position(margenX, 20 + pasoY * 3);
  botonGuardar.position(margenX, 20 + pasoY * 4 + 10);
}


function limpiarImagenNegro() {
  imgFinal.loadPixels();
  for (let i = 0; i < imgFinal.pixels.length; i += 4) {
    imgFinal.pixels[i] = 10;     
    imgFinal.pixels[i + 1] = 10; 
    imgFinal.pixels[i + 2] = 10; 
    imgFinal.pixels[i + 3] = 255; 
  }
  imgFinal.updatePixels();
}

function procesarArchivoAudio(file) {
  if (!file || !file.file) return;
  if (intervaloProcesado) clearInterval(intervaloProcesado);
  
  let nombreSocio = file.name;
  nombreArchivoOriginal = nombreSocio.substring(0, nombreSocio.lastIndexOf('.')) || nombreSocio;
  
  estadoMensaje = "Procesando flujo de datos...";
  limpiarImagenNegro();
  
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  let lector = new FileReader();
  lector.onload = function(evento) {
    audioContext.decodeAudioData(evento.target.result, function(buffer) {
      audioBuffer = buffer;
      sRate = audioBuffer.sampleRate;
      canalAudio = audioBuffer.getChannelData(0);
      totalMuestras = canalAudio.length;
      
      muestrasPorPixelBase = sRate * 0.000190; 
      decodificarSSTV();
    });
  };
  lector.readAsArrayBuffer(file.file);
}

function decodificarSSTV() {
  estadoMensaje = "";
  if (intervaloProcesado) clearInterval(intervaloProcesado);
  
  indiceMuestra = 0;
  lastZeroCrossSample = 0;
  muestraUltimoSync = 0;
  currentLine = -2; 
  lineSyncFound = false;
  limpiarImagenNegro();

  let valReloj = float(inputClock.value());
  let valOffset = float(inputOffset.value());
  
  if (isNaN(valReloj) || valReloj <= 0) valReloj = 1.0;
  if (isNaN(valOffset)) valOffset = 0;

  let muestrasPorPixelCalibrado = muestrasPorPixelBase * valReloj;

  intervaloProcesado = setInterval(() => {
    if (!canalAudio || indiceMuestra >= totalMuestras - 1) {
      clearInterval(intervaloProcesado);
      return;
    }

    let muestraFinalBloque = min(indiceMuestra + 100000, totalMuestras - 1);
    imgFinal.loadPixels();

    for (let i = indiceMuestra; i < muestraFinalBloque; i++) {
      let sample1 = canalAudio[i];
      let sample2 = canalAudio[i+1];

      if ((sample1 >= 0 && sample2 < 0) || (sample1 <= 0 && sample2 > 0)) {
        let muestrasEntreCruces = i - lastZeroCrossSample;

        if (muestrasEntreCruces > 0) {
          let freq = (sRate / muestrasEntreCruces) * 0.5;

          if (freq >= 1140 && freq <= 1260) {
            if (!lineSyncFound) {
              if (currentLine >= 0 && currentLine < imgHeight) {
                renderizarLineaYUV(currentLine);
              }
              currentLine += 2; 
              lineSyncFound = true;
              muestraUltimoSync = i + valOffset; 
            }
            if (currentLine >= imgHeight) {
              clearInterval(intervaloProcesado);
              break;
            }
            lastZeroCrossSample = i;
            continue;
          } 

          if (freq >= 1450 && freq <= 2350) {
            lineSyncFound = false;
            
            let muestrasDesdeSync = i - muestraUltimoSync;
            let pixelRelativo = floor(muestrasDesdeSync / muestrasPorPixelCalibrado);

            let valor = map(freq, 1500, 2300, 0, 255);
            valor = constrain(valor, 0, 255);

            if (pixelRelativo >= 0 && pixelRelativo < 640) {
              bufferY0[pixelRelativo] = valor;
            } 
            else if (pixelRelativo >= 640 && pixelRelativo < 1280) {
              bufferV[pixelRelativo - 640] = valor;
            }
            else if (pixelRelativo >= 1280 && pixelRelativo < 1920) {
              bufferU[pixelRelativo - 1280] = valor;
            }
            else if (pixelRelativo >= 1920 && pixelRelativo < 2560) {
              bufferY1[pixelRelativo - 1920] = valor;
            }
          }
        }
        lastZeroCrossSample = i;
      }
    }

    imgFinal.updatePixels();
    indiceMuestra = muestraFinalBloque;
  }, 4);
}

function guardarImagenSSTV() {
  let d = new Date();
  let anio = d.getFullYear();
  let mes = nf(d.getMonth() + 1, 2);
  let dia = nf(d.getDate(), 2);
  let hora = nf(d.getHours(), 2);
  let mi = nf(d.getMinutes(), 2); 
  let seg = nf(d.getSeconds(), 2);
  
  let marcaTiempo = `${anio}${mes}${dia}_${hora}${mi}${seg}`;
  let nombreFinal = `${nombreArchivoOriginal}_${marcaTiempo}_PD120.png`;
  
  save(imgFinal, nombreFinal);
}

function renderizarLineaYUV(lineaY) {
  let factorChroma = float(inputChroma.value());
  if (isNaN(factorChroma)) factorChroma = 1.0;

  for (let x = 0; x < 640; x++) {
    let y0 = bufferY0[x];
    let y1 = bufferY1[x];
    let v  = (bufferV[x] - 128) * factorChroma; 
    let u  = (bufferU[x] - 128) * factorChroma;

    if (factorChroma < 0) {
      let temp = v; v = u; u = temp;
    }

    let r0 = constrain(y0 + 1.402 * v, 0, 255);
    let g0 = constrain(y0 - 0.344136 * u - 0.714136 * v, 0, 255);
    let b0 = constrain(y0 + 1.772 * u, 0, 255);

    let r1 = constrain(y1 + 1.402 * v, 0, 255);
    let g1 = constrain(y1 - 0.344136 * u - 0.714136 * v, 0, 255);
    let b1 = constrain(y1 + 1.772 * u, 0, 255);

    if (lineaY >= 0 && lineaY < imgHeight) {
      let idx0 = (x + lineaY * imgWidth) * 4;
      imgFinal.pixels[idx0]     = r0;
      imgFinal.pixels[idx0 + 1] = g0;
      imgFinal.pixels[idx0 + 2] = b0;
      imgFinal.pixels[idx0 + 3] = 255;
    }

    if ((lineaY + 1) >= 0 && (lineaY + 1) < imgHeight) {
      let idx1 = (x + (lineaY + 1) * imgWidth) * 4;
      imgFinal.pixels[idx1]     = r1;
      imgFinal.pixels[idx1 + 1] = g1;
      imgFinal.pixels[idx1 + 2] = b1;
      imgFinal.pixels[idx1 + 3] = 255;
    }
  }
}
