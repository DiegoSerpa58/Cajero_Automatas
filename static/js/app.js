(() => {
  const MAX = (window.__ATM__ && window.__ATM__.MAX) || 500;

  // Helpers
  const $ = sel => document.querySelector(sel);
  const montoEl = $("#monto");
  const iniciarBtn = $("#iniciar");
  const resumen = $("#resumen");
  const timeline = $("#timeline");
  const tabla = $("#tabla");
  const tbody = tabla.querySelector("tbody");
  const restanteBadge = $("#restante");

  let historial = [];
  let q0 = 0;
  let restante = 0;

  function validarMonto(n){
    if (!Number.isInteger(n)) throw new Error("Ingrese un número entero.");
    if (n <= 0) throw new Error("El monto debe ser mayor a 0.");
    if (n % 10 !== 0) throw new Error("El monto debe ser múltiplo de 10.");
    if (n > MAX) throw new Error(`El monto máximo es ${MAX}.`);
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
    if (b > restante) return;
    const qn = restante - b;
    historial.push({ q: restante, b, qn });
    restante = qn;
    actualizar();
  }

  function deshacer(){
    if (!historial.length) return;
    const last = historial.pop();
    restante = last.q;
    actualizar();
  }

  function reiniciar(){
    preparar();
  }

  function actualizar(){
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
  
  function pintar(pasos, conteo, inicial){
    const desglose = Object.entries(conteo)
      .filter(([_,c])=>c>0)
      .sort((a,b)=>b[0]-a[0])
      .map(([d,c])=>`<span class="pill">$${d} × ${c}</span>`)
      .join(" ");
    resumen.innerHTML = `
      <b>Estado inicial:</b> ${inicial} &nbsp;•&nbsp;
      <b>Estado final:</b> <span class="ok">${restante}</span> &nbsp;•&nbsp;
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
    // Atajos de monto (mantener solo modo manual)
document.querySelectorAll(".q").forEach(btn => {
  btn.addEventListener("click", () => {
    const q = parseInt(btn.dataset.q, 10);
    document.querySelector("#monto").value = q;
    preparar();          // reinicia el AFD con ese monto
  });
});

  // Eventos
  iniciarBtn.addEventListener("click", preparar);
  document.querySelectorAll(".bill").forEach(b=>{
    b.addEventListener("click", ()=> aplicarBillete(parseInt(b.dataset.b,10)));
  });
  $("#deshacer").addEventListener("click", deshacer);
  $("#reiniciar").addEventListener("click", reiniciar);

  // Inicio automático
  preparar();
})();
