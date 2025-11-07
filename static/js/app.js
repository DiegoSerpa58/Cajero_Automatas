(() => {
  const MAX = (window.__ATM__ && window.__ATM__.MAX) || 500;
  const DENOMS = [100, 50, 20, 10];

  // Helpers DOM
  const $ = sel => document.querySelector(sel);
  const montoEl = $("#monto");
  const btnSim = $("#simular");
  const btnModoAuto = $("#modoAuto");
  const btnModoManual = $("#modoManual");
  const manualControls = $("#manualControls");
  const resumen = $("#resumen");
  const timeline = $("#timeline");
  const tabla = $("#tabla");
  const tbody = tabla.querySelector("tbody");
  const restanteBadge = $("#restante");

  let modo = "auto";
  let historial = [];
  let q0 = 0;
  let restante = 0;

  // --------- UI State ----------
  function setModo(m){
    modo = m;
    btnModoAuto.classList.toggle("active", m==="auto");
    btnModoAuto.setAttribute("aria-pressed", m==="auto");
    btnModoManual.classList.toggle("active", m==="manual");
    btnModoManual.setAttribute("aria-pressed", m==="manual");
    manualControls.style.display = (m==="manual") ? "flex" : "none";
    if (m === "manual") prepararManual();
  }

  // --------- Pintado ----------
  function pintar(pasos, conteo, inicial){
    const entries = Object.entries(conteo).map(([k,v]) => [parseInt(k,10), v])
      .sort((a,b)=>b[0]-a[0]);
    const desglose = entries
      .filter(([_,c])=>c>0)
      .map(([d,c])=>`<span class="pill">$${d} × ${c}</span>`)
      .join(" ");

    resumen.innerHTML = `
      <b>Estado inicial:</b> ${inicial} &nbsp;•&nbsp;
      <b>Estado final:</b> <span class="ok">${(pasos.at(-1)?.qn ?? 0)}</span> &nbsp;•&nbsp;
      <b>Billetes:</b> ${desglose || "-"}
    `;

    timeline.innerHTML = "";
    const estados = [inicial, ...pasos.map(p=>p.qn)];
    estados.forEach((q,i)=>{
      const div = document.createElement("div");
      div.className = "state" + (q === 0 ? " final" : "");
      div.textContent = q;
      timeline.appendChild(div);
      if(i < estados.length - 1){
        const a = document.createElement("div");
        a.className = "arrow";
        a.innerHTML = `&nbsp;→&nbsp;<span class="muted">(${pasos[i].b})</span>`;
        timeline.appendChild(a);
      }
    });

    tbody.innerHTML = "";
    pasos.forEach((p,i)=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i+1}</td><td>${p.q}</td><td>$${p.b}</td><td>${p.qn}</td>`;
      tbody.appendChild(tr);
    });
    tabla.style.display = pasos.length ? "table" : "none";
  }

  function mostrarError(msg){
    resumen.innerHTML = `<span class="err">Error:</span> ${msg}`;
    timeline.innerHTML = "";
    tbody.innerHTML = "";
    tabla.style.display = "none";
  }

  // --------- Backend (Automático) ----------
  async function simularAuto(){
    try{
      const monto = parseInt(montoEl.value, 10);
      // Validación rápida de UI
      if (!Number.isInteger(monto)) throw new Error("Ingrese un número entero.");
      if (monto <= 0) throw new Error("El monto debe ser mayor a 0.");
      if (monto % 10 !== 0) throw new Error("El monto debe ser múltiplo de 10.");
      if (monto > MAX) throw new Error(`El monto máximo es ${MAX}.`);

      const resp = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: monto })
      });
      const json = await resp.json();
      if (!json.ok) throw new Error(json.error || "Error del servidor");

      historial = json.steps;
      q0 = json.initial;
      const conteo = json.bills || {};
      pintar(historial, conteo, q0);
    }catch(err){
      mostrarError(err.message);
    }
  }

  // --------- Manual (Frontend) ----------
  function validarMonto(n){
    if (!Number.isInteger(n)) throw new Error("Ingrese un número entero.");
    if (n <= 0) throw new Error("El monto debe ser mayor a 0.");
    if (n % 10 !== 0) throw new Error("El monto debe ser múltiplo de 10.");
    if (n > MAX) throw new Error(`El monto máximo es ${MAX}.`);
  }

  function prepararManual(){
    try{
      const monto = parseInt(montoEl.value, 10);
      validarMonto(monto);
      q0 = monto; restante = monto; historial = [];
      actualizarManual();
    }catch(err){
      mostrarError(err.message);
    }
  }

  function actualizarManual(){
    const conteo = {10:0,20:0,50:0,100:0};
    historial.forEach(x => { conteo[x.b] = (conteo[x.b] || 0) + 1; });
    pintar(historial, conteo, q0);
    restanteBadge.textContent = `Restante: ${restante}`;
    document.querySelectorAll(".bill").forEach(btn=>{
      const b = parseInt(btn.dataset.b,10);
      btn.disabled = (b > restante);
      btn.style.opacity = b > restante ? .35 : 1;
    });
  }

  function aplicarBillete(b){
    if (b > restante) return;
    const qn = restante - b;
    historial.push({ q: restante, b, qn });
    restante = qn;
    actualizarManual();
  }

  function deshacer(){
    if (!historial.length) return;
    const last = historial.pop();
    restante = last.q;
    actualizarManual();
  }

  function reiniciar(){
    prepararManual();
  }

  // --------- Eventos ----------
  btnSim.addEventListener("click", ()=> modo==="auto" ? simularAuto() : prepararManual());
  btnModoAuto.addEventListener("click", ()=> setModo("auto"));
  btnModoManual.addEventListener("click", ()=> setModo("manual"));
  document.querySelectorAll(".q").forEach(b=>{
    b.addEventListener("click", ()=>{
      montoEl.value = b.dataset.q;
      (modo==="auto" ? simularAuto() : prepararManual());
    });
  });
  document.querySelectorAll(".bill").forEach(b=>{
    b.addEventListener("click", ()=> aplicarBillete(parseInt(b.dataset.b,10)));
  });
  $("#deshacer").addEventListener("click", deshacer);
  $("#reiniciar").addEventListener("click", reiniciar);

  // Primera simulación
  simularAuto();
})();
