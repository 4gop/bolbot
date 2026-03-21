import { Link } from "wouter";
import { Bot, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center mb-8 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/20 blur-xl"></div>
        <Bot size={40} className="text-primary relative z-10" />
        <AlertTriangle size={20} className="text-yellow-500 absolute bottom-4 right-4 z-10" />
      </div>
      
      <h1 className="text-4xl font-display font-bold text-white mb-4">404 - Not Found</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Oops! Looks like BolBot couldn't find the page you're looking for.
      </p>
      
      <Link 
        href="/" 
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
      >
        Go back to Chat
      </Link>
    </div>
  );
}
