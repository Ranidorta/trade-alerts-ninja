from fastapi import FastAPI
from api import revalidate

app = FastAPI(
    title="Trade Alerts Ninja API",
    description="API para revalidação e consulta de sinais de trade",
    version="1.0.0"
)

# Rota básica para verificar status da API
@app.get("/")
def root():
    return {"status": "API online 🚀"}

# Inclui os endpoints do módulo de revalidação
app.include_router(revalidate.router, prefix="/signals")
