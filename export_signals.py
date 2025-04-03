
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

# Carrega variáveis do .env
load_dotenv()

# Conecta ao banco
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

# Exporta sinais
df = pd.read_sql("SELECT * FROM signals", engine)
df.to_csv("sinais.csv", index=False)

print("✅ Arquivo sinais.csv criado com sucesso!")
