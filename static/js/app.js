(() => {
  const MAX = (window.__ATM__ && window.__ATM__.MAX) || 500;

  // Helpers
  const $ = sel => document.querySelector(sel);
  const montoEl   = $("#monto");
  const iniciarBtn = $("#iniciar");
  const resumen   = $("#resumen");
  const timeline  = $("#timeline");
  const tabla     = $("#tabla");
  const tbody     = tabla.querySelector("tbody");
  const restanteBadge = $("#restante");
  const progressBar   = $("#progressBar");
  const progressLabel = $("#progressLabel");
  const contadorBilletes = $("#contadorBilletes");

  let historial = [];
  let q0 = 0;
  let restante = 0;

  /* ── Reloj en vivo ── */
  function tickReloj(){
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    const ss = String(now.getSeconds()).padStart(2,'0');
    const dd = String(now.getDate()).padStart(2,'0');
    const mo = String(now.getMonth()+1).padStart(2,'0');
    const yy = now.getFullYear();
    const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const relojEl = $("#reloj");
    const fechaEl = $("#fecha");
    if(relojEl) relojEl.textContent = `${hh}:${mm}:${ss}`;
    if(fechaEl) fechaEl.textContent = `${dias[now.getDay()]} ${dd}/${mo}/${yy}`;
  }
  setInterval(tickReloj, 1000);
  tickReloj();

  /* ── Barra de progreso ── */
  function actualizarProgreso(){
    if(!q0){ progressBar.style.width='0%'; progressLabel.textContent='0% completado'; return; }
    const pct = Math.round(((q0 - restante) / q0) * 100);
    progressBar.style.width = pct + '%';
    progressLabel.textContent = pct === 100 ? '✅ ¡Retiro completado!' : `${pct}% completado`;
  }

  /* ── Contador de billetes ── */
  function actualizarContador(){
    const total = historial.length;
    contadorBilletes.textContent = `${total} billete${total !== 1 ? 's' : ''} entregado${total !== 1 ? 's' : ''}`;
  }

  /* ── Confeti al completar ── */
  function lanzarConfeti(){
    const colores = ['#f97316','#fb923c','#fbbf24','#ea580c','#fff7ed','#22c55e'];
    for(let i = 0; i < 60; i++){
      const div = document.createElement('div');
      div.className = 'confetti-piece';
      div.style.cssText = `
        left:${Math.random()*100}vw;
        background:${colores[Math.floor(Math.random()*colores.length)]};
        width:${6+Math.random()*8}px;
        height:${6+Math.random()*8}px;
        border-radius:${Math.random() > .5 ? '50%' : '2px'};
        animation-duration:${1.5+Math.random()*2}s;
        animation-delay:${Math.random()*0.6}s;
      `;
      document.body.appendChild(div);
      div.addEventListener('animationend', () => div.remove());
    }
  }

  /* ── Validación ── */
  function validarMonto(n){
    if (!Number.isInteger(n))    throw new Error("Ingrese un número entero.");
    if (n <= 0)                  throw new Error("El monto debe ser mayor a 0.");
    if (n % 10 !== 0)            throw new Error("El monto debe ser múltiplo de 10.");
    if (n > MAX)                 throw new Error(`El monto máximo es $${MAX}.`);
  }

  function preparar(){
    try{
      const monto = parseInt(montoEl.value, 10);
      validarMonto(monto);
      q0 = monto;
      restante = monto;
      historial = [];
      actualizar();
    }catch(err){
      mostrarError(err.message);
    }
  }

  function aplicarBillete(b){
    if(b > restante) return;
    const qn = restante - b;
    historial.push({ q: restante, b, qn });
    restante = qn;
    actualizar();
    if(restante === 0) setTimeout(lanzarConfeti, 150);
  }

  function deshacer(){
    if(!historial.length) return;
    const last = historial.pop();
    restante = last.q;
    actualizar();
  }

  function reiniciar(){ preparar(); }

  function actualizar(){
    const conteo = {10:0, 20:0, 50:0, 100:0};
    historial.forEach(x => { conteo[x.b] = (conteo[x.b] || 0) + 1; });
    pintar(historial, conteo, q0);
    restanteBadge.textContent = `Restante: $${restante}`;
    document.querySelectorAll(".bill").forEach(btn => {
      const b = parseInt(btn.dataset.b, 10);
      btn.disabled = (b > restante);
    });
    actualizarProgreso();
    actualizarContador();
  }

  function pintar(pasos, conteo, inicial){
    const desglose = Object.entries(conteo)
      .filter(([_,c]) => c > 0)
      .sort((a,b) => b[0] - a[0])
      .map(([d,c]) => `<span class="pill">$${d} × ${c}</span>`)
      .join(" ");

    const esFinal = restante === 0 && pasos.length > 0;
    resumen.innerHTML = `
      <b>Estado inicial:</b> <span class="pill">$${inicial}</span> &nbsp;→&nbsp;
      <b>Estado actual:</b> <span class="${esFinal ? 'ok' : ''}">${esFinal ? '✅ $0 — ¡Completado!' : `$${restante}`}</span>
      &nbsp;•&nbsp; <b>Billetes:</b> ${desglose || '<span class="muted">—</span>'}
    `;

    timeline.innerHTML = "";
    const estados = [inicial, ...pasos.map(p => p.qn)];
    estados.forEach((q, i) => {
      const div = document.createElement("div");
      div.className = "state bill-anim" + (q === 0 ? " final" : "") + (i === estados.length - 1 ? " current" : "");
      div.textContent = `$${q}`;
      timeline.appendChild(div);
      if(i < estados.length - 1){
        const a = document.createElement("div");
        a.className = "arrow";
        a.innerHTML = `&nbsp;→ <span class="muted">(${pasos[i].b})</span> &nbsp;`;
        timeline.appendChild(a);
      }
    });

    tbody.innerHTML = "";
    pasos.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i+1}</td><td>$${p.q}</td><td>💵 $${p.b}</td><td>$${p.qn}</td>`;
      tbody.appendChild(tr);
    });
    tabla.style.display = pasos.length ? "table" : "none";
  }

  function mostrarError(msg){
    resumen.innerHTML = `<span class="err">⚠️ Error:</span> ${msg}`;
    timeline.innerHTML = "";
    tbody.innerHTML = "";
    tabla.style.display = "none";
  }

  /* ── Atajos de monto rápido ── */
  document.querySelectorAll(".q").forEach(btn => {
    btn.addEventListener("click", () => {
      montoEl.value = parseInt(btn.dataset.q, 10);
      preparar();
    });
  });

  /* ── Eventos ── */
  iniciarBtn.addEventListener("click", preparar);
  document.querySelectorAll(".bill").forEach(b => {
    b.addEventListener("click", () => aplicarBillete(parseInt(b.dataset.b, 10)));
  });
  $("#deshacer").addEventListener("click", deshacer);
  $("#reiniciar").addEventListener("click", reiniciar);

  /* ── Inicio automático ── */
  preparar();
})();
