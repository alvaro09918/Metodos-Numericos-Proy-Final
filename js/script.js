'use strict';

/* ==================== NAVEGACIÓN POR PESTAÑAS ==================== */
document.querySelectorAll('.tab').forEach(tabElement => {
  tabElement.addEventListener('click', () => {
    // Remover estado activo de todas las pestañas
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    // Activar la pestaña seleccionada
    tabElement.classList.add('active');
    const panelId = tabElement.dataset.tab;
    document.getElementById(panelId).classList.add('active');
  });
});

/* ==================== CASO A: PROPAGACIÓN DEL ERROR ==================== */
document.getElementById('runA').addEventListener('click', () => {
  // Obtener valores de entrada
  const masaNitrogeno = parseFloat(document.getElementById('mA').value);
  const incertidumbreMasa = parseFloat(document.getElementById('smA').value);
  const volumenExtracto = parseFloat(document.getElementById('VA').value);
  const incertidumbreVolumen = parseFloat(document.getElementById('sVA').value);
  let numeroMuestrasMC = parseInt(document.getElementById('mcN').value) || 5000;
  const unidadesSeleccionadas = document.getElementById('unitsA').value;

  const elementoSalida = document.getElementById('outA');
  const contenedorHistograma = document.getElementById('histA');

  // Validación de entradas
  if (!(masaNitrogeno > 0 && volumenExtracto > 0 && incertidumbreMasa >= 0 && incertidumbreVolumen >= 0)) {
    elementoSalida.textContent = '❌ Error: Por favor, ingresa valores válidos (masa y volumen deben ser positivos).';
    return;
  }

  // Factores de conversión de unidades
  const factoresConversion = {
    'g_per_mL': 1,
    'g_per_L': 1000,
    'mg_per_L': 1000000
  };
  
  const etiquetasUnidades = {
    'g_per_mL': 'g/mL',
    'g_per_L': 'g/L',
    'mg_per_L': 'mg/L'
  };

  // Cálculo de concentración puntual
  const concentracion = masaNitrogeno / volumenExtracto; // g/mL
  
  // Propagación analítica del error
  const incertidumbreConcentracion = Math.sqrt(
    Math.pow((1 / volumenExtracto) * incertidumbreMasa, 2) +
    Math.pow((masaNitrogeno / (volumenExtracto * volumenExtracto)) * incertidumbreVolumen, 2)
  );

  // Simulación Monte Carlo con distribución normal (Box-Muller)
  const muestrasMonteCarlo = new Float64Array(numeroMuestrasMC);
  
  for (let i = 0; i < numeroMuestrasMC; i++) {
    // Generar dos números aleatorios uniformes
    const u1 = Math.random();
    const u2 = Math.random();
    
    // Transformación Box-Muller para obtener variables normales
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    
    // Generar masa y volumen con incertidumbre
    const masaSimulada = masaNitrogeno + incertidumbreMasa * z1;
    let volumenSimulado = volumenExtracto + incertidumbreVolumen * z2;
    
    // Asegurar que el volumen sea positivo (rechazar muestras no físicas)
    let intentos = 0;
    while (volumenSimulado <= 0 && intentos < 5) {
      const u1b = Math.random();
      const u2b = Math.random();
      const zb = Math.sqrt(-2 * Math.log(u1b)) * Math.cos(2 * Math.PI * u2b);
      volumenSimulado = volumenExtracto + incertidumbreVolumen * zb;
      intentos++;
    }
    
    // Calcular concentración para esta muestra
    muestrasMonteCarlo[i] = masaSimulada / volumenSimulado;
  }

  // Calcular estadísticas de Monte Carlo
  let sumaMuestras = 0;
  for (let i = 0; i < numeroMuestrasMC; i++) {
    sumaMuestras += muestrasMonteCarlo[i];
  }
  const mediaMC = sumaMuestras / numeroMuestrasMC;

  let sumaCuadrados = 0;
  for (let i = 0; i < numeroMuestrasMC; i++) {
    sumaCuadrados += Math.pow(muestrasMonteCarlo[i] - mediaMC, 2);
  }
  const desviacionEstandarMC = Math.sqrt(sumaCuadrados / (numeroMuestrasMC - 1));

  // Intervalo de confianza del 95% (±1.96σ)
  const intervaloConfianza95 = [
    mediaMC - 1.96 * desviacionEstandarMC,
    mediaMC + 1.96 * desviacionEstandarMC
  ];

  // Convertir a unidades seleccionadas
  const factorEscala = factoresConversion[unidadesSeleccionadas];
  const etiquetaUnidad = etiquetasUnidades[unidadesSeleccionadas];
  
  const concentracionMostrar = concentracion * factorEscala;
  const incertidumbreMostrar = incertidumbreConcentracion * factorEscala;
  const mediaMCMostrar = mediaMC * factorEscala;
  const desviacionMCMostrar = desviacionEstandarMC * factorEscala;
  const intervaloMostrar = [
    intervaloConfianza95[0] * factorEscala,
    intervaloConfianza95[1] * factorEscala
  ];

  // Mostrar resultados
  elementoSalida.textContent = [
    '═══════════════════════════════════════════════════════',
    '📊 RESULTADOS DEL ANÁLISIS DE CONCENTRACIÓN',
    '═══════════════════════════════════════════════════════',
    '',
    '🎯 Método Analítico (Propagación de Errores):',
    `   Concentración: ${concentracionMostrar.toFixed(6)} ${etiquetaUnidad}`,
    `   Incertidumbre (σ_C): ${incertidumbreMostrar.toExponential(3)} ${etiquetaUnidad}`,
    '',
    '🎲 Método Monte Carlo (Simulación):',
    `   Número de muestras: ${numeroMuestrasMC.toLocaleString()}`,
    `   Media: ${mediaMCMostrar.toFixed(6)} ${etiquetaUnidad}`,
    `   Desviación estándar: ${desviacionMCMostrar.toExponential(3)} ${etiquetaUnidad}`,
    '',
    '📈 Intervalo de Confianza 95%:',
    `   [${intervaloMostrar[0].toFixed(6)}, ${intervaloMostrar[1].toFixed(6)}] ${etiquetaUnidad}`,
    '',
    '💡 Observación:',
    `   Diferencia σ_analítico vs σ_MC: ${Math.abs(incertidumbreMostrar - desviacionMCMostrar).toExponential(3)}`,
    '   Las desviaciones deben ser similares para validar la linearización.',
    '═══════════════════════════════════════════════════════'
  ].join('\n');

  // Dibujar histograma
  dibujarHistogramaSVG(muestrasMonteCarlo, contenedorHistograma, etiquetaUnidad, factorEscala);
});

/* ==================== FUNCIÓN: DIBUJAR HISTOGRAMA SVG ==================== */
function dibujarHistogramaSVG(arregloMuestras, contenedor, etiquetaUnidad, factorEscala) {
  contenedor.innerHTML = '';
  const totalMuestras = arregloMuestras.length;
  
  // Encontrar valores mínimo y máximo
  let valorMinimo = Infinity;
  let valorMaximo = -Infinity;
  for (let i = 0; i < totalMuestras; i++) {
    if (arregloMuestras[i] < valorMinimo) valorMinimo = arregloMuestras[i];
    if (arregloMuestras[i] > valorMaximo) valorMaximo = arregloMuestras[i];
  }
  
  if (!isFinite(valorMinimo) || !isFinite(valorMaximo)) {
    contenedor.textContent = '❌ No se pudo generar el histograma';
    return;
  }

  // Crear bins (barras del histograma)
  const numeroBins = 30;
  const bins = new Array(numeroBins).fill(0);
  const rangoTotal = valorMaximo - valorMinimo || 1;
  
  for (let valor of arregloMuestras) {
    let indiceBin = Math.floor((valor - valorMinimo) / rangoTotal * numeroBins);
    if (indiceBin < 0) indiceBin = 0;
    if (indiceBin >= numeroBins) indiceBin = numeroBins - 1;
    bins[indiceBin]++;
  }
  
  const cuentaMaxima = Math.max(...bins);

  // Crear SVG
  const ancho = contenedor.clientWidth || 600;
  const alto = contenedor.clientHeight || 250;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', alto);
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  
  // Padding para márgenes
  const padding = 40;
  const anchoBarra = (ancho - padding * 2) / numeroBins;
  
  // Dibujar barras
  for (let i = 0; i < numeroBins; i++) {
    const x = padding + i * anchoBarra;
    const alturaBarra = (bins[i] / cuentaMaxima) * (alto - padding * 2);
    const y = alto - padding - alturaBarra;
    
    const rectangulo = document.createElementNS(svgNS, 'rect');
    rectangulo.setAttribute('x', x);
    rectangulo.setAttribute('y', y);
    rectangulo.setAttribute('width', anchoBarra * 0.9);
    rectangulo.setAttribute('height', alturaBarra);
    rectangulo.setAttribute('fill', 'url(#gradientBar)');
    rectangulo.setAttribute('rx', '2');
    svg.appendChild(rectangulo);
  }
  
  // Definir gradiente para las barras
  const defs = document.createElementNS(svgNS, 'defs');
  const gradient = document.createElementNS(svgNS, 'linearGradient');
  gradient.setAttribute('id', 'gradientBar');
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '0%');
  gradient.setAttribute('y2', '100%');
  
  const stop1 = document.createElementNS(svgNS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('style', 'stop-color:#3b82f6;stop-opacity:1');
  
  const stop2 = document.createElementNS(svgNS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('style', 'stop-color:#06b6d4;stop-opacity:1');
  
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);
  
  // Título del histograma
  const titulo = document.createElementNS(svgNS, 'text');
  titulo.setAttribute('x', ancho / 2);
  titulo.setAttribute('y', 20);
  titulo.setAttribute('fill', '#94a3b8');
  titulo.setAttribute('font-size', '14');
  titulo.setAttribute('font-weight', '600');
  titulo.setAttribute('text-anchor', 'middle');
  titulo.textContent = `Distribución Monte Carlo (${totalMuestras.toLocaleString()} muestras)`;
  svg.appendChild(titulo);
  
  // Etiqueta de eje X
  const etiquetaEje = document.createElementNS(svgNS, 'text');
  etiquetaEje.setAttribute('x', ancho / 2);
  etiquetaEje.setAttribute('y', alto - 5);
  etiquetaEje.setAttribute('fill', '#64748b');
  etiquetaEje.setAttribute('font-size', '12');
  etiquetaEje.setAttribute('text-anchor', 'middle');
  etiquetaEje.textContent = `Concentración (${etiquetaUnidad})`;
  svg.appendChild(etiquetaEje);
  
  contenedor.appendChild(svg);
}

/* ==================== CASO B: BÚSQUEDA DE RAÍCES ==================== */
document.getElementById('runB').addEventListener('click', () => {
  // Obtener parámetros de entrada
  const alcanceHorizontal = parseFloat(document.getElementById('xB').value);
  const alturaObjetivo = parseFloat(document.getElementById('yB').value);
  const velocidadInicial = parseFloat(document.getElementById('v0B').value);
  const gravedad = parseFloat(document.getElementById('gB').value);
  const tolerancia = parseFloat(document.getElementById('tolB').value) || 1e-8;
  const estimacionInicialGrados = parseFloat(document.getElementById('guessB').value) || 45;
  
  const elementoSalida = document.getElementById('outB');
  const contenedorTrayectoria = document.getElementById('trajB');

  // Definir función f(θ) = 0 para encontrar ángulo
  // f(θ) = x·tan(θ) - (g·x²)/(2·v₀²·cos²(θ)) - y
  function ecuacionTrayectoria(theta) {
    const cosTheta = Math.cos(theta);
    if (Math.abs(cosTheta) < 1e-12) return 1e9; // Evitar división por cero
    return alcanceHorizontal * Math.tan(theta) - 
           (gravedad * alcanceHorizontal * alcanceHorizontal) / 
           (2 * velocidadInicial * velocidadInicial * cosTheta * cosTheta) - 
           alturaObjetivo;
  }

  // Búsqueda de raíces en el intervalo (0, π/2)
  const limiteInferior = 0.001; // Evitar θ = 0
  const limiteSuperior = Math.PI / 2 - 0.001; // Evitar θ = 90°
  const numeroMuestras = 200;
  let raicesEncontradas = [];
  
  // Buscar cambios de signo mediante muestreo
  let xAnterior = limiteInferior;
  let fAnterior = ecuacionTrayectoria(limiteInferior);
  
  for (let i = 1; i <= numeroMuestras; i++) {
    const xActual = limiteInferior + (limiteSuperior - limiteInferior) * i / numeroMuestras;
    const fActual = ecuacionTrayectoria(xActual);
    
    // Si hay cambio de signo, aplicar bisección
    if (isFinite(fActual) && isFinite(fAnterior) && fAnterior * fActual <= 0) {
      try {
        const raiz = metodoBiseccion(ecuacionTrayectoria, xAnterior, xActual, tolerancia, 60);
        raicesEncontradas.push(raiz);
      } catch (error) {
        // Ignorar si no converge en este subintervalo
      }
    }
    
    xAnterior = xActual;
    fAnterior = fActual;
  }

  // Aplicar método de Newton desde la estimación inicial
  const estimacionInicialRadianes = estimacionInicialGrados * Math.PI / 180;
  try {
    const resultadoNewton = metodoNewton(ecuacionTrayectoria, estimacionInicialRadianes, tolerancia, 100);
    // Agregar si es una raíz nueva
    if (!raicesEncontradas.some(r => Math.abs(r - resultadoNewton.raiz) < 1e-6)) {
      raicesEncontradas.push(resultadoNewton.raiz);
    }
  } catch (error) {
    // Newton no convergió desde esta estimación
  }

  // Verificar si se encontraron soluciones
  if (raicesEncontradas.length === 0) {
    elementoSalida.textContent = [
      '═══════════════════════════════════════════════════════',
      '❌ NO SE ENCONTRÓ SOLUCIÓN',
      '═══════════════════════════════════════════════════════',
      '',
      '⚠️ No se encontró ningún ángulo válido en el rango (0°, 90°).',
      '',
      '💡 Posibles causas:',
      '   • La velocidad inicial es insuficiente para alcanzar el objetivo',
      '   • El punto objetivo está fuera del alcance máximo del proyectil',
      `   • Alcance máximo teórico: ${(velocidadInicial * velocidadInicial / gravedad).toFixed(2)} m`,
      '',
      '🔧 Sugerencias:',
      '   • Aumenta la velocidad inicial (v₀)',
      '   • Reduce la distancia horizontal (x)',
      '   • Verifica que las coordenadas sean físicamente alcanzables',
      '═══════════════════════════════════════════════════════'
    ].join('\n');
    contenedorTrayectoria.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;">No hay trayectoria para mostrar</div>';
    return;
  }

  // Procesar y ordenar raíces encontradas
  raicesEncontradas = raicesEncontradas.map(raiz => {
    return {
      radianes: raiz,
      grados: raiz * 180 / Math.PI,
      error: Math.abs(ecuacionTrayectoria(raiz))
    };
  }).sort((a, b) => a.grados - b.grados);

  // Generar salida de resultados
  let lineasSalida = [];
  lineasSalida.push('═══════════════════════════════════════════════════════');
  lineasSalida.push('🎯 SOLUCIONES ENCONTRADAS');
  lineasSalida.push('═══════════════════════════════════════════════════════');
  lineasSalida.push('');
  lineasSalida.push('📐 Ángulos de lanzamiento válidos:');
  lineasSalida.push('');
  
  raicesEncontradas.forEach((solucion, indice) => {
    lineasSalida.push(`${indice + 1}. θ = ${solucion.grados.toFixed(4)}°`);
    lineasSalida.push(`   (${solucion.radianes.toFixed(6)} radianes)`);
    lineasSalida.push(`   Error residual: ${solucion.error.toExponential(2)}`);
    lineasSalida.push('');
  });
  
  lineasSalida.push('─────────────────────────────────────────────────────');
  lineasSalida.push('📊 Información del lanzamiento:');
  lineasSalida.push(`   Objetivo: (${alcanceHorizontal} m, ${alturaObjetivo} m)`);
  lineasSalida.push(`   Velocidad inicial: ${velocidadInicial} m/s`);
  lineasSalida.push(`   Gravedad: ${gravedad} m/s²`);
  lineasSalida.push('');
  lineasSalida.push('💡 Nota: Se muestra la trayectoria con el ángulo más bajo');
  lineasSalida.push('   (ángulo más práctico para aplicaciones robóticas).');
  lineasSalida.push('═══════════════════════════════════════════════════════');
  
  elementoSalida.textContent = lineasSalida.join('\n');

  // Calcular y dibujar trayectoria con el primer ángulo (más bajo)
  const anguloSeleccionado = raicesEncontradas[0].radianes;
  const puntosTrayectoria = calcularTrayectoria(
    velocidadInicial, 
    anguloSeleccionado, 
    gravedad, 
    alcanceHorizontal
  );
  
  dibujarTrayectoriaSVG(
    contenedorTrayectoria, 
    puntosTrayectoria, 
    alcanceHorizontal, 
    alturaObjetivo
  );
});

/* ==================== MÉTODO DE BISECCIÓN ==================== */
function metodoBiseccion(funcion, a, b, tolerancia, maxIteraciones) {
  let fa = funcion(a);
  let fb = funcion(b);
  
  if (!isFinite(fa) || !isFinite(fb)) {
    throw new Error('f(a) o f(b) no es finito');
  }
  
  if (fa * fb > 0) {
    throw new Error('No hay cambio de signo en el intervalo');
  }
  
  let iteracion = 0;
  let c, fc;
  
  while (iteracion < maxIteraciones) {
    c = (a + b) / 2;
    fc = funcion(c);
    
    if (!isFinite(fc)) {
      throw new Error('f(c) no es finito');
    }
    
    if (Math.abs(fc) < tolerancia || (b - a) / 2 < tolerancia) {
      break;
    }
    
    if (fa * fc <= 0) {
      b = c;
      fb = fc;
    } else {
      a = c;
      fa = fc;
    }
    
    iteracion++;
  }
  
  return c;
}

/* ==================== MÉTODO DE NEWTON-RAPHSON ==================== */
function metodoNewton(funcion, x0, tolerancia, maxIteraciones) {
  let x = x0;
  let iteracion = 0;
  
  while (iteracion < maxIteraciones) {
    const fx = funcion(x);
    
    // Derivada numérica
    const h = 1e-8;
    const dfx = (funcion(x + h) - funcion(x - h)) / (2 * h);
    
    if (Math.abs(dfx) < 1e-12) {
      throw new Error('Derivada cercana a cero - no se puede continuar');
    }
    
    const xNueva = x - fx / dfx;
    
    if (!isFinite(xNueva)) {
      throw new Error('Método divergió');
    }
    
    if (Math.abs(xNueva - x) < tolerancia) {
      return { raiz: xNueva, iteraciones: iteracion };
    }
    
    x = xNueva;
    iteracion++;
  }
  
  throw new Error('Newton-Raphson no convergió');
}

/* ==================== CALCULAR PUNTOS DE TRAYECTORIA ==================== */
function calcularTrayectoria(v0, theta, g, xObjetivo) {
  const puntos = [];
  
  // Tiempo máximo de vuelo
  const tiempoMaximo = (2 * v0 * Math.sin(theta)) / g;
  const pasos = 150;
  
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos * tiempoMaximo;
    const x = v0 * Math.cos(theta) * t;
    const y = v0 * Math.sin(theta) * t - 0.5 * g * t * t;
    
    if (y >= 0) { // Solo puntos sobre el suelo
      puntos.push({ x, y });
    }
  }
  
  return puntos;
}

/* ==================== DIBUJAR TRAYECTORIA SVG ==================== */
function dibujarTrayectoriaSVG(contenedor, trayectoria, xObjetivo, yObjetivo) {
  contenedor.innerHTML = '';
  
  const ancho = contenedor.clientWidth || 600;
  const alto = contenedor.clientHeight || 250;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', alto);
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  
  // Encontrar rangos
  const coordenadasX = trayectoria.map(p => p.x);
  const coordenadasY = trayectoria.map(p => p.y);
  const maxX = Math.max(...coordenadasX, xObjetivo);
  const maxY = Math.max(...coordenadasY, yObjetivo, 1);
  
  const padding = 40;
  
  // Función para escalar coordenadas
  const escalarX = (x) => padding + (x / maxX) * (ancho - 2 * padding);
  const escalarY = (y) => alto - padding - (y / maxY) * (alto - 2 * padding);
  
  // Dibujar línea del suelo
  const lineaSuelo = document.createElementNS(svgNS, 'line');
  lineaSuelo.setAttribute('x1', padding);
  lineaSuelo.setAttribute('y1', escalarY(0));
  lineaSuelo.setAttribute('x2', ancho - padding);
  lineaSuelo.setAttribute('y2', escalarY(0));
  lineaSuelo.setAttribute('stroke', '#64748b');
  lineaSuelo.setAttribute('stroke-width', '2');
  lineaSuelo.setAttribute('stroke-dasharray', '5,5');
  svg.appendChild(lineaSuelo);
  
  // Dibujar trayectoria
  const puntosTrayectoria = trayectoria.map(p => 
    `${escalarX(p.x)},${escalarY(p.y)}`
  ).join(' ');
  
  const polilinea = document.createElementNS(svgNS, 'polyline');
  polilinea.setAttribute('points', puntosTrayectoria);
  polilinea.setAttribute('fill', 'none');
  polilinea.setAttribute('stroke', 'url(#gradientTraj)');
  polilinea.setAttribute('stroke-width', '3');
  polilinea.setAttribute('stroke-linecap', 'round');
  svg.appendChild(polilinea);
  
  // Gradiente para la trayectoria
  const defs = document.createElementNS(svgNS, 'defs');
  const gradient = document.createElementNS(svgNS, 'linearGradient');
  gradient.setAttribute('id', 'gradientTraj');
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '100%');
  gradient.setAttribute('y2', '0%');
  
  const stop1 = document.createElementNS(svgNS, 'stop');
  stop1.setAttribute('offset', '0%');
  stop1.setAttribute('style', 'stop-color:#10b981;stop-opacity:1');
  
  const stop2 = document.createElementNS(svgNS, 'stop');
  stop2.setAttribute('offset', '100%');
  stop2.setAttribute('style', 'stop-color:#3b82f6;stop-opacity:1');
  
  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);
  
  // Punto objetivo
  const xObj = escalarX(xObjetivo);
  const yObj = escalarY(yObjetivo);
  
  const circuloObjetivo = document.createElementNS(svgNS, 'circle');
  circuloObjetivo.setAttribute('cx', xObj);
  circuloObjetivo.setAttribute('cy', yObj);
  circuloObjetivo.setAttribute('r', '6');
  circuloObjetivo.setAttribute('fill', '#ef4444');
  circuloObjetivo.setAttribute('stroke', '#fff');
  circuloObjetivo.setAttribute('stroke-width', '2');
  svg.appendChild(circuloObjetivo);
  
  // Etiqueta del objetivo
  const textoObjetivo = document.createElementNS(svgNS, 'text');
  textoObjetivo.setAttribute('x', xObj + 12);
  textoObjetivo.setAttribute('y', yObj - 8);
  textoObjetivo.setAttribute('fill', '#ef4444');
  textoObjetivo.setAttribute('font-size', '12');
  textoObjetivo.setAttribute('font-weight', '600');
  textoObjetivo.textContent = `Objetivo (${xObjetivo}, ${yObjetivo})`;
  svg.appendChild(textoObjetivo);
  
  // Punto de lanzamiento
  const circuloInicio = document.createElementNS(svgNS, 'circle');
  circuloInicio.setAttribute('cx', escalarX(0));
  circuloInicio.setAttribute('cy', escalarY(0));
  circuloInicio.setAttribute('r', '5');
  circuloInicio.setAttribute('fill', '#10b981');
  circuloInicio.setAttribute('stroke', '#fff');
  circuloInicio.setAttribute('stroke-width', '2');
  svg.appendChild(circuloInicio);
  
  // Título
  const titulo = document.createElementNS(svgNS, 'text');
  titulo.setAttribute('x', ancho / 2);
  titulo.setAttribute('y', 20);
  titulo.setAttribute('fill', '#94a3b8');
  titulo.setAttribute('font-size', '14');
  titulo.setAttribute('font-weight', '600');
  titulo.setAttribute('text-anchor', 'middle');
  titulo.textContent = 'Trayectoria del Proyectil';
  svg.appendChild(titulo);
  
  contenedor.appendChild(svg);
}

/* ==================== CASO C: INTEGRACIÓN NUMÉRICA ==================== */
document.getElementById('runC').addEventListener('click', () => {
  // Obtener parámetros
  const irradianciasMaxima = parseFloat(document.getElementById('ImaxC').value);
  const horaAmanecer = parseFloat(document.getElementById('sunriseC').value);
  const horaAtardecer = parseFloat(document.getElementById('sunsetC').value);
  const factorInclinacion = parseFloat(document.getElementById('kC').value);
  let numeroSubintervalos = parseInt(document.getElementById('NC').value) || 200;
  
  // Asegurar número par para Simpson
  if (numeroSubintervalos < 2) numeroSubintervalos = 2;
  if (numeroSubintervalos % 2 === 1) numeroSubintervalos++;
  
  const elementoSalida = document.getElementById('outC');
  const contenedorGrafico = document.getElementById('plotC');

  // Modelo de irradiancia: I(t) = Imax * sin(π * (t - sunrise) / (sunset - sunrise))
  function irradiancia(t) {
    if (t < horaAmanecer || t > horaAtardecer) return 0;
    
    const proporcion = (t - horaAmanecer) / (horaAtardecer - horaAmanecer);
    return irradianciasMaxima * Math.sin(Math.PI * proporcion);
  }

  // Calcular integrales
  const energiaTrapecio = integralTrapecio(irradiancia, horaAmanecer, horaAtardecer, numeroSubintervalos) * factorInclinacion;
  const energiaSimpson = integralSimpson(irradiancia, horaAmanecer, horaAtardecer, numeroSubintervalos) * factorInclinacion;
  
  // Referencia con alta precisión
  const energiaReferencia = integralTrapecio(irradiancia, horaAmanecer, horaAtardecer, 5000) * factorInclinacion;
  
  // Calcular errores
  const errorTrapecio = Math.abs(energiaTrapecio - energiaReferencia);
  const errorSimpson = Math.abs(energiaSimpson - energiaReferencia);
  const errorRelativoTrapecio = (errorTrapecio / energiaReferencia) * 100;
  const errorRelativoSimpson = (errorSimpson / energiaReferencia) * 100;

  // Mostrar resultados
  elementoSalida.textContent = [
    '═══════════════════════════════════════════════════════',
    '☀️ CÁLCULO DE ENERGÍA SOLAR DIARIA',
    '═══════════════════════════════════════════════════════',
    '',
    '📊 Parámetros del sistema:',
    `   Irradiancia máxima (I_max): ${irradianciasMaxima} W/m²`,
    `   Intervalo de luz solar: [${horaAmanecer}:00, ${horaAtardecer}:00]`,
    `   Duración del día: ${(horaAtardecer - horaAmanecer).toFixed(1)} horas`,
    `   Factor de inclinación (k): ${factorInclinacion}`,
    '',
    '⚡ Resultados de integración numérica:',
    '',
    `🔷 Método del Trapecio (N = ${numeroSubintervalos}):`,
    `   Energía total: ${energiaTrapecio.toFixed(4)} Wh/m²`,
    `   Error absoluto: ${errorTrapecio.toExponential(3)} Wh/m²`,
    `   Error relativo: ${errorRelativoTrapecio.toFixed(6)}%`,
    '',
    `🔶 Método de Simpson (N = ${numeroSubintervalos}):`,
    `   Energía total: ${energiaSimpson.toFixed(4)} Wh/m²`,
    `   Error absoluto: ${errorSimpson.toExponential(3)} Wh/m²`,
    `   Error relativo: ${errorRelativoSimpson.toFixed(6)}%`,
    '',
    `📐 Valor de referencia (N = 5000):`,
    `   Energía de referencia: ${energiaReferencia.toFixed(4)} Wh/m²`,
    '',
    '💡 Observación:',
    `   Simpson es ${(errorTrapecio / errorSimpson).toFixed(1)}× más preciso que Trapecio`,
    '   para el mismo número de subintervalos.',
    '═══════════════════════════════════════════════════════'
  ].join('\n');

  // Dibujar gráfico de irradiancia
  dibujarGraficoIrradiancia(
    contenedorGrafico, 
    irradiancia, 
    horaAmanecer, 
    horaAtardecer, 
    factorInclinacion
  );
});

/* ==================== INTEGRACIÓN POR TRAPECIO COMPUESTO ==================== */
function integralTrapecio(funcion, a, b, n) {
  const h = (b - a) / n;
  let suma = 0.5 * (funcion(a) + funcion(b));
  
  for (let i = 1; i < n; i++) {
    suma += funcion(a + i * h);
  }
  
  return suma * h;
}

/* ==================== INTEGRACIÓN POR SIMPSON COMPUESTO ==================== */
function integralSimpson(funcion, a, b, n) {
  // Asegurar que n sea par
  if (n % 2 !== 0) n++;
  
  const h = (b - a) / n;
  let suma = funcion(a) + funcion(b);
  
  for (let i = 1; i < n; i++) {
    const xi = a + i * h;
    suma += (i % 2 === 0) ? 2 * funcion(xi) : 4 * funcion(xi);
  }
  
  return suma * h / 3;
}

/* ==================== DIBUJAR GRÁFICO DE IRRADIANCIA ==================== */
function dibujarGraficoIrradiancia(contenedor, funcionIrradiancia, inicio, fin, factorK) {
  contenedor.innerHTML = '';
  
  const ancho = contenedor.clientWidth || 600;
  const alto = contenedor.clientHeight || 250;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', alto);
  svg.setAttribute('viewBox', `0 0 ${ancho} ${alto}`);
  
  const padding = 45;
  
  // Generar puntos de muestreo
  const numeroMuestras = 300;
  let tiempos = [];
  let valores = [];
  let valorMaximo = 0;
  
  for (let i = 0; i <= numeroMuestras; i++) {
    const t = inicio + (fin - inicio) * i / numeroMuestras;
    const valor = funcionIrradiancia(t) * factorK;
    tiempos.push(t);
    valores.push(valor);
    if (valor > valorMaximo) valorMaximo = valor;
  }
  
  if (valorMaximo === 0) valorMaximo = 1;
  
  // Función de escalado
  const escalarX = (t) => padding + ((t - inicio) / (fin - inicio)) * (ancho - 2 * padding);
  const escalarY = (v) => alto - padding - (v / valorMaximo) * (alto - 2 * padding);
  
  // Crear área bajo la curva (polígono relleno)
  let puntosArea = `${escalarX(inicio)},${escalarY(0)} `;
  for (let i = 0; i < tiempos.length; i++) {
    puntosArea += `${escalarX(tiempos[i])},${escalarY(valores[i])} `;
  }
  puntosArea += `${escalarX(fin)},${escalarY(0)}`;
  
  const poligonoArea = document.createElementNS(svgNS, 'polygon');
  poligonoArea.setAttribute('points', puntosArea);
  poligonoArea.setAttribute('fill', 'url(#gradientArea)');
  poligonoArea.setAttribute('opacity', '0.4');
  svg.appendChild(poligonoArea);
  
  // Definir gradiente para el área
  const defs = document.createElementNS(svgNS, 'defs');
  const gradientArea = document.createElementNS(svgNS, 'linearGradient');
  gradientArea.setAttribute('id', 'gradientArea');
  gradientArea.setAttribute('x1', '0%');
  gradientArea.setAttribute('y1', '0%');
  gradientArea.setAttribute('x2', '0%');
  gradientArea.setAttribute('y2', '100%');
  
  const stopA1 = document.createElementNS(svgNS, 'stop');
  stopA1.setAttribute('offset', '0%');
  stopA1.setAttribute('style', 'stop-color:#f59e0b;stop-opacity:1');
  
  const stopA2 = document.createElementNS(svgNS, 'stop');
  stopA2.setAttribute('offset', '100%');
  stopA2.setAttribute('style', 'stop-color:#ef4444;stop-opacity:0.2');
  
  gradientArea.appendChild(stopA1);
  gradientArea.appendChild(stopA2);
  defs.appendChild(gradientArea);
  
  // Gradiente para la línea
  const gradientLinea = document.createElementNS(svgNS, 'linearGradient');
  gradientLinea.setAttribute('id', 'gradientLine');
  gradientLinea.setAttribute('x1', '0%');
  gradientLinea.setAttribute('y1', '0%');
  gradientLinea.setAttribute('x2', '100%');
  gradientLinea.setAttribute('y2', '0%');
  
  const stopL1 = document.createElementNS(svgNS, 'stop');
  stopL1.setAttribute('offset', '0%');
  stopL1.setAttribute('style', 'stop-color:#f59e0b;stop-opacity:1');
  
  const stopL2 = document.createElementNS(svgNS, 'stop');
  stopL2.setAttribute('offset', '50%');
  stopL2.setAttribute('style', 'stop-color:#ef4444;stop-opacity:1');
  
  const stopL3 = document.createElementNS(svgNS, 'stop');
  stopL3.setAttribute('offset', '100%');
  stopL3.setAttribute('style', 'stop-color:#f59e0b;stop-opacity:1');
  
  gradientLinea.appendChild(stopL1);
  gradientLinea.appendChild(stopL2);
  gradientLinea.appendChild(stopL3);
  defs.appendChild(gradientLinea);
  svg.appendChild(defs);
  
  // Dibujar línea de irradiancia
  let puntosLinea = '';
  for (let i = 0; i < tiempos.length; i++) {
    puntosLinea += `${escalarX(tiempos[i])},${escalarY(valores[i])} `;
  }
  
  const polilinea = document.createElementNS(svgNS, 'polyline');
  polilinea.setAttribute('points', puntosLinea);
  polilinea.setAttribute('fill', 'none');
  polilinea.setAttribute('stroke', 'url(#gradientLine)');
  polilinea.setAttribute('stroke-width', '3');
  polilinea.setAttribute('stroke-linecap', 'round');
  svg.appendChild(polilinea);
  
  // Ejes
  // Eje X
  const ejeX = document.createElementNS(svgNS, 'line');
  ejeX.setAttribute('x1', padding);
  ejeX.setAttribute('y1', alto - padding);
  ejeX.setAttribute('x2', ancho - padding);
  ejeX.setAttribute('y2', alto - padding);
  ejeX.setAttribute('stroke', '#64748b');
  ejeX.setAttribute('stroke-width', '2');
  svg.appendChild(ejeX);
  
  // Eje Y
  const ejeY = document.createElementNS(svgNS, 'line');
  ejeY.setAttribute('x1', padding);
  ejeY.setAttribute('y1', padding);
  ejeY.setAttribute('x2', padding);
  ejeY.setAttribute('y2', alto - padding);
  ejeY.setAttribute('stroke', '#64748b');
  ejeY.setAttribute('stroke-width', '2');
  svg.appendChild(ejeY);
  
  // Etiquetas de ejes
  // Eje X - Tiempo
  for (let hora = Math.ceil(inicio); hora <= Math.floor(fin); hora += 2) {
    const x = escalarX(hora);
    const marca = document.createElementNS(svgNS, 'line');
    marca.setAttribute('x1', x);
    marca.setAttribute('y1', alto - padding);
    marca.setAttribute('x2', x);
    marca.setAttribute('y2', alto - padding + 5);
    marca.setAttribute('stroke', '#64748b');
    marca.setAttribute('stroke-width', '1');
    svg.appendChild(marca);
    
    const texto = document.createElementNS(svgNS, 'text');
    texto.setAttribute('x', x);
    texto.setAttribute('y', alto - padding + 18);
    texto.setAttribute('fill', '#94a3b8');
    texto.setAttribute('font-size', '11');
    texto.setAttribute('text-anchor', 'middle');
    texto.textContent = `${hora}:00`;
    svg.appendChild(texto);
  }
  
  // Eje Y - Irradiancia
  const pasoY = valorMaximo / 4;
  for (let i = 0; i <= 4; i++) {
    const valor = i * pasoY;
    const y = escalarY(valor);
    
    const marca = document.createElementNS(svgNS, 'line');
    marca.setAttribute('x1', padding - 5);
    marca.setAttribute('y1', y);
    marca.setAttribute('x2', padding);
    marca.setAttribute('y2', y);
    marca.setAttribute('stroke', '#64748b');
    marca.setAttribute('stroke-width', '1');
    svg.appendChild(marca);
    
    const texto = document.createElementNS(svgNS, 'text');
    texto.setAttribute('x', padding - 10);
    texto.setAttribute('y', y + 4);
    texto.setAttribute('fill', '#94a3b8');
    texto.setAttribute('font-size', '10');
    texto.setAttribute('text-anchor', 'end');
    texto.textContent = valor.toFixed(0);
    svg.appendChild(texto);
  }
  
  // Etiqueta del eje Y
  const etiquetaY = document.createElementNS(svgNS, 'text');
  etiquetaY.setAttribute('x', 15);
  etiquetaY.setAttribute('y', alto / 2);
  etiquetaY.setAttribute('fill', '#94a3b8');
  etiquetaY.setAttribute('font-size', '12');
  etiquetaY.setAttribute('text-anchor', 'middle');
  etiquetaY.setAttribute('transform', `rotate(-90, 15, ${alto / 2})`);
  etiquetaY.textContent = 'I(t) × k (W/m²)';
  svg.appendChild(etiquetaY);
  
  // Etiqueta del eje X
  const etiquetaX = document.createElementNS(svgNS, 'text');
  etiquetaX.setAttribute('x', ancho / 2);
  etiquetaX.setAttribute('y', alto - 5);
  etiquetaX.setAttribute('fill', '#94a3b8');
  etiquetaX.setAttribute('font-size', '12');
  etiquetaX.setAttribute('text-anchor', 'middle');
  etiquetaX.textContent = 'Hora del día (h)';
  svg.appendChild(etiquetaX);
  
  // Título del gráfico
  const titulo = document.createElementNS(svgNS, 'text');
  titulo.setAttribute('x', ancho / 2);
  titulo.setAttribute('y', 20);
  titulo.setAttribute('fill', '#f59e0b');
  titulo.setAttribute('font-size', '14');
  titulo.setAttribute('font-weight', '600');
  titulo.setAttribute('text-anchor', 'middle');
  titulo.textContent = 'Perfil de Irradiancia Solar';
  svg.appendChild(titulo);
  
  contenedor.appendChild(svg);
}