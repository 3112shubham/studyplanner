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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-12 sm:py-24">
        <div className="container mx-auto px-4 text-center">
          {user && userData?.name && (
            <p className="text-blue-100 text-lg mb-4 font-semibold">
              Welcome back, <span className="text-yellow-200">{userData.name}</span>! 👋
            </p>
          )}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6">
            Master GATE CS in {' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-orange-200">
              35 Days
            </span>
          </h1>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto text-blue-100">
            Personalized study plans, progress tracking, and expert guidance to ace GATE Computer Science
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
                <Link
                  href="/register"
                  className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors"
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
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            Why Choose Our Platform?
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Everything you need for a successful GATE preparation
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 border-2 border-blue-100 hover:border-blue-300 shadow-md transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div className="text-blue-600 mb-4 p-3 bg-blue-100 rounded-lg w-fit">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            How It Works
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Four simple steps to start your GATE preparation journey
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Sign Up</h3>
              <p className="text-gray-700">Create your free account in seconds</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Select Topics</h3>
              <p className="text-gray-700">Mark topics as strong, moderate, or weak</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Get Plan</h3>
              <p className="text-gray-700">Receive your personalized 35-day plan</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">4</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Track Progress</h3>
              <p className="text-gray-700">Monitor daily progress and stay on track</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}