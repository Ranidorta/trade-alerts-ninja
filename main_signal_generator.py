
# ... keep existing code (imports and configuration loading)

# Adiciona import do sistema intradiário
from signals.intraday_signal_integrator import test_intraday_system

def main():
    """
    ATUALIZADO: Main function com suporte ao novo sistema intradiário
    """
    logger.info("🚀 Starting ADVANCED trade_signal_agent v2.1 with INTRADAY support")
    
    # ... keep existing code (initialize components, ML retraining, evaluator)
    
    try:
        while True:
            # ... keep existing code (get symbols)
            
            logger.info(f"Processing {len(symbols)} symbols with DUAL strategy (Intraday + Monster)")
            
            # NOVO: Teste periódico do sistema intradiário (a cada 50 ciclos)
            if hasattr(main, 'cycle_count'):
                main.cycle_count += 1
            else:
                main.cycle_count = 1
                
            if main.cycle_count % 50 == 0:
                try:
                    logger.info("🧪 Testando sistema intradiário...")
                    test_results = test_intraday_system(['BTCUSDT', 'ETHUSDT'])
                    logger.info(f"📊 Resultado teste intradiário: {test_results['success_rate']:.2%}")
                except Exception as e:
                    logger.error(f"❌ Erro no teste intradiário: {e}")
            
            # Process each symbol with DUAL strategy (Intraday + Monster)
            signals_generated = 0
            for symbol in symbols[:15]:  
                logger.info(f"🔍 Analyzing symbol: {symbol}")
                
                try:
                    # ATUALIZADO: Usa o novo sistema dual
                    raw_signal = generate_signal(symbol)
                    
                    # ... keep existing code (validate signal, apply risk management, store signal)
                    
                    if signal:
                        # Apply DYNAMIC risk management
                        final = manage_risk(signal)
                        
                        if final:
                            # Store signal
                            insert_signal(final)
                            signals_generated += 1
                            
                            # Determina tipo de estratégia para log
                            strategy_type = final.get('strategy', 'unknown')
                            if 'intraday' in strategy_type:
                                logger.info(f"⚡ INTRADAY Signal stored: {symbol} {final['signal']} @ {final['entry_price']}")
                            else:
                                logger.info(f"✅ MONSTER Signal stored: {symbol} {final['signal']} @ {final['entry_price']}")
                            
                            # ... keep existing code (update risk manager)
                        else:
                            logger.info(f"🛑 Signal blocked by risk management: {symbol}")
                    else:
                        logger.info(f"🛑 Signal validation failed: {symbol}")
                        
                except Exception as e:
                    logger.exception(f"❌ Error processing {symbol}: {str(e)}")
            
            logger.info(f"🏁 Cycle completed: {signals_generated} signals generated")
            
            # ... keep existing code (periodic ML update, sleep)
            
    except KeyboardInterrupt:
        logger.info("Execution interrupted by user")
    except Exception as e:
        logger.exception(f"Unexpected error: {str(e)}")

# ... keep existing code (if __name__ == "__main__" block)
