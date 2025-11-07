from flask import Flask, render_template, request, jsonify

DENOMINACIONES = [100, 50, 20, 10]
MAX_RETIRO = 500

app = Flask(__name__)

# --------------------------
# Lógica del Autómata (AFD)
# --------------------------
def validar_monto(monto: int):
    if not isinstance(monto, int):
        raise ValueError("El monto debe ser un número entero.")
    if monto <= 0:
        raise ValueError("El monto debe ser mayor a 0.")
    if monto % 10 != 0:
        raise ValueError("El monto debe ser múltiplo de 10.")
    if monto > MAX_RETIRO:
        raise ValueError(f"El monto máximo de retiro es {MAX_RETIRO}.")

def retiro_greedy(monto: int):
    """
    Estrategia determinista (greedy): siempre toma el billete más grande <= q.
    Retorna:
      pasos: lista de dicts {q, b, qn}
      conteo: dict {denominación: cantidad}
    """
    validar_monto(monto)
    q = monto
    pasos = []
    conteo = {10: 0, 20: 0, 50: 0, 100: 0}

    while q > 0:
        aplicado = False
        for b in DENOMINACIONES:
            if b <= q:
                qn = q - b
                pasos.append({"q": q, "b": b, "qn": qn})
                conteo[b] += 1
                q = qn
                aplicado = True
                break
        if not aplicado:
            # Estado trampa (no debería ocurrir con múltiplos de 10)
            raise RuntimeError(f"No hay transición válida desde {q}.")
    return pasos, conteo

# --------------------------
# Rutas
# --------------------------
@app.get("/")
def home():
    return render_template("index.jinja2", max_retiro=MAX_RETIRO)

@app.post("/api/simulate")
def api_simulate():
    try:
        data = request.get_json(force=True) or {}
        monto = int(data.get("amount", 0))
        pasos, conteo = retiro_greedy(monto)
        return jsonify({
            "ok": True,
            "initial": monto,
            "final": 0,
            "steps": pasos,
            "bills": conteo
        })
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

# Salud (opcional)
@app.get("/api/health")
def api_health():
    return jsonify({"ok": True, "max": MAX_RETIRO, "denoms": DENOMINACIONES})

if __name__ == "__main__":
    # Debug para desarrollo; en producción usar WSGI (gunicorn, etc.)
    app.run(host="0.0.0.0", port=5000, debug=True)
