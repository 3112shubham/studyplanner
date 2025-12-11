'use client';

import { useAuth } from '@/lib/context/AuthContext';
import Link from 'next/link';
import { BookOpen, Target, BarChart3, Users, Clock, CheckCircle } from 'lucide-react';

export default function Home() {
  const { user, userData } = useAuth();

  const features = [
    {
      icon: <Target className="h-8 w-8" />,
      title: 'Personalized Plans',
      description: 'Get a custom study plan based on your strengths and weaknesses',
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: '35-Day Schedule',
      description: 'Structured daily schedule covering all GATE CS subjects',
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: 'Progress Tracking',
      description: 'Track your daily progress with interactive charts',
    },
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: 'Topic Management',
      description: 'Categorize topics as strong, moderate, or weak',
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Admin Dashboard',
      description: 'Admins can create and manage study plans',
    },
    {
      icon: <CheckCircle className="h-8 w-8" />,
      title: 'Daily Checkpoints',
      description: 'Mark completed topics and track your journey',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-bg text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Master GATE CS in{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-pink-300">
              35 Days
            </span>
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Personalized study plans, progress tracking, and expert guidance to ace GATE Computer Science
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link
                href="/user/dashboard"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  href="/register"
                  className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            Why Choose Our Platform?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass-card p-6 rounded-2xl shadow-soft transition-transform hover:scale-105"
              >
                <div className="text-primary-500 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
              <p className="text-gray-600">Create your account</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Select Topics</h3>
              <p className="text-gray-600">Mark topics as strong/moderate/weak</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Plan</h3>
              <p className="text-gray-600">Receive personalized study plan</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-gray-600">Monitor daily progress and adjust</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}