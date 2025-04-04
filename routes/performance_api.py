
from flask import Blueprint, jsonify, g
from sqlalchemy.orm import Session
from services.evaluate_signals_pg import Signal, engine

bp = Blueprint('performance_api', __name__)

@bp.route("/api/performance", methods=["GET"])
def get_performance():
    # This endpoint will be protected by the main app's middleware
    session = Session(bind=engine)
    total = session.query(Signal).filter(Signal.resultado != None).count()
    vencedores = session.query(Signal).filter(Signal.resultado == "vencedor").count()
    parciais = session.query(Signal).filter(Signal.resultado == "parcial").count()
    perdedores = session.query(Signal).filter(Signal.resultado == "perdedor").count()
    falsos = session.query(Signal).filter(Signal.resultado == "falso").count()
    session.close()

    def pct(v):
        return round((v / total) * 100, 2) if total > 0 else 0

    return jsonify({
        "total": total,
        "vencedor": {"quantidade": vencedores, "percentual": pct(vencedores)},
        "parcial": {"quantidade": parciais, "percentual": pct(parciais)},
        "perdedor": {"quantidade": perdedores, "percentual": pct(perdedores)},
        "falso": {"quantidade": falsos, "percentual": pct(falsos)}
    })
