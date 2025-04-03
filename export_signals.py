
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Create database connection
engine = create_engine(DATABASE_URL)

# Query signals table and export to CSV
df = pd.read_sql("SELECT * FROM signals", engine)
df.to_csv("sinais.csv", index=False)
print("✅ Arquivo 'sinais.csv' criado com sucesso!")
print(f"Total de {len(df)} sinais exportados")
