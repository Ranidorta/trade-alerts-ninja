
from apscheduler.schedulers.background import BackgroundScheduler
from services.evaluate_signals_pg import main as avaliar_sinais

scheduler = BackgroundScheduler()

# Roda a cada hora para verificar sinais ainda sem resultado
def iniciar_avaliador_automatico():
    scheduler.add_job(avaliar_sinais, 'interval', hours=1, id='avaliador_de_sinais')
    scheduler.start()

# Em app.py (ou onde for inicializar o servidor Flask)
# from scheduler.evaluation_job import iniciar_avaliador_automatico
# iniciar_avaliador_automatico()
