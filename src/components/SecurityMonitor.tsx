import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface SecurityLog {
  type: string;
  email?: string;
  timestamp: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

const SecurityMonitor = () => {
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const loadSecurityLogs = () => {
      const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
      setSecurityLogs(logs.slice(-10).reverse()); // Show last 10 events
    };

    loadSecurityLogs();
    
    // Refresh logs every 5 seconds
    const interval = setInterval(loadSecurityLogs, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-green-500';
      case 'logout':
        return 'bg-blue-500';
      case 'failed_login':
        return 'bg-red-500';
      case 'signup':
        return 'bg-purple-500';
      case 'suspicious_activity':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      failed_login: 'Login Falhou',
      signup: 'Cadastro',
      password_reset: 'Reset Senha',
      suspicious_activity: 'Atividade Suspeita'
    };
    return labels[type] || type;
  };

  const clearLogs = () => {
    localStorage.removeItem('security_logs');
    setSecurityLogs([]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Monitor de Segurança
        </CardTitle>
        <CardDescription>
          Últimos eventos de segurança da aplicação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showDetails ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Limpar Logs
          </Button>
        </div>
        
        {securityLogs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum evento de segurança registrado
          </p>
        ) : (
          <div className="space-y-3">
            {securityLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge className={`${getEventTypeColor(log.type)} text-white`}>
                  {getEventTypeLabel(log.type)}
                </Badge>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {log.email || 'Sistema'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  
                  {showDetails && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>User Agent: {log.userAgent}</div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                          Metadata: {JSON.stringify(log.metadata, null, 2)}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {log.type === 'failed_login' && log.metadata?.attemptCount && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      Tentativa {log.metadata.attemptCount} de login falhou
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityMonitor;