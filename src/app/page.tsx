'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Wallet, 
  Send, 
  Clock, 
  Shield, 
  Users, 
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">XLM</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">XLM Auto Withdraw</h1>
              <p className="text-slate-400 text-sm">Telegram Bot System</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
            Online
          </Badge>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Automated XLM Withdrawals
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              to Binance
            </span>
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Secure, automated, and reliable Stellar Lumens (XLM) withdrawal system 
            with multi-wallet support, scheduling, and enterprise-grade security.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
              <Send className="w-4 h-4 mr-2" />
              Open Telegram Bot
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
              Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Wallet className="w-6 h-6" />}
            title="Multi-Wallet Support"
            description="Manage multiple Stellar wallets with encrypted mnemonic storage. AES-256-GCM encryption ensures your keys are always secure."
          />
          <FeatureCard
            icon={<Clock className="w-6 h-6" />}
            title="Auto Scheduling"
            description="Set up automatic withdrawals at custom intervals. Perfect for recurring transfers and DCA strategies."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Enterprise Security"
            description="Per-user key derivation, idempotency keys, rate limiting, and daily limits protect your assets."
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Multi-User System"
            description="Support for multiple users with admin approval workflow. Complete user management dashboard."
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Queue System"
            description="BullMQ-powered queue with retry logic, exponential backoff, and dead letter handling."
          />
          <FeatureCard
            icon={<Send className="w-6 h-6" />}
            title="Direct to Binance"
            description="Withdraw directly to your Binance deposit address with memo support."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-8">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StepCard
              number={1}
              title="Start Bot"
              description="Open the Telegram bot and register your account"
            />
            <StepCard
              number={2}
              title="Import Wallet"
              description="Add your Stellar wallet and encrypt your mnemonic"
            />
            <StepCard
              number={3}
              title="Set Schedule"
              description="Configure auto-withdraw or make instant transfers"
            />
            <StepCard
              number={4}
              title="Track & Manage"
              description="Monitor transactions and manage everything via buttons"
            />
          </div>
        </div>
      </section>

      {/* Admin Features */}
      <section className="container mx-auto px-4 py-12">
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Admin Panel Features
            </CardTitle>
            <CardDescription className="text-slate-400">
              Complete administrative control via Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdminFeature text="User approval and management" />
              <AdminFeature text="Wallet control and monitoring" />
              <AdminFeature text="Transaction tracking and retry" />
              <AdminFeature text="Broadcast messaging system" />
              <AdminFeature text="System health dashboard" />
              <AdminFeature text="Rate limit configuration" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tech Stack */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap justify-center gap-4">
          <TechBadge name="Node.js" />
          <TechBadge name="Grammy" />
          <TechBadge name="Stellar SDK" />
          <TechBadge name="BullMQ" />
          <TechBadge name="Redis" />
          <TechBadge name="Prisma" />
          <TechBadge name="SQLite" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-slate-400 text-sm">
              © 2024 XLM Auto Withdraw Bot. Built for security and reliability.
            </div>
            <div className="flex gap-6 text-slate-400 text-sm">
              <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/30 transition-colors">
      <CardHeader>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center text-cyan-400 mb-4">
          {icon}
        </div>
        <CardTitle className="text-white text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-400 text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
        {number}
      </div>
      <h4 className="text-white font-semibold mb-2">{title}</h4>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  )
}

function AdminFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-300">
      <CheckCircle className="w-4 h-4 text-green-400" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

function TechBadge({ name }: { name: string }) {
  return (
    <Badge variant="outline" className="bg-slate-800/50 text-slate-300 border-slate-600 hover:border-cyan-500/50 transition-colors">
      {name}
    </Badge>
  )
}
