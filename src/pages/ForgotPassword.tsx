
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Mail } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Por favor, informe seu e-mail.",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      // Limpar o campo de e-mail após o envio bem-sucedido
      setEmail('');
    } catch (error: any) {
      console.error("Erro ao enviar e-mail de recuperação:", error);
      
      let errorMessage = "Não foi possível enviar o e-mail de recuperação.";
      
      // Tratar mensagens de erro específicas do Firebase
      if (error.code === 'auth/user-not-found') {
        errorMessage = "Não existe uma conta associada a este e-mail.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "O formato do e-mail é inválido.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Muitas tentativas. Tente novamente mais tarde.";
      }
      
      toast({
        variant: "destructive",
        title: "Erro ao enviar e-mail",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-foreground/10">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recuperar Senha
            </CardTitle>
            <CardDescription>
              Enviaremos um link para você redefinir sua senha
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
              <Link 
                to="/login" 
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={16} className="mr-2" />
                Voltar para o login
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
