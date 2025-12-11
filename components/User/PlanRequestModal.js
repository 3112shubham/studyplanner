'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const TOPICS = [
  // Aptitude
  { id: 'quantitative_aptitude', name: 'Quantitative Aptitude', category: 'General Aptitude' },
  { id: 'logical_reasoning', name: 'Logical Reasoning', category: 'General Aptitude' },
  { id: 'verbal_ability', name: 'Verbal Ability', category: 'General Aptitude' },
  { id: 'reading_comprehension', name: 'Reading Comprehension', category: 'General Aptitude' },
  
  // Engineering Mathematics
  { id: 'linear_algebra', name: 'Linear Algebra', category: 'Engineering Mathematics' },
  { id: 'calculus', name: 'Calculus', category: 'Engineering Mathematics' },
  { id: 'probability_stats', name: 'Probability & Statistics', category: 'Engineering Mathematics' },
  { id: 'discrete_math_1', name: 'Discrete Math (Part 1)', category: 'Engineering Mathematics' },
  { id: 'discrete_math_2', name: 'Discrete Math (Part 2)', category: 'Engineering Mathematics' },
  
  // Core CS Subjects
  { id: 'digital_logic', name: 'Digital Logic', category: 'Core CS' },
  { id: 'coa', name: 'Computer Organization & Architecture', category: 'Core CS' },
  { id: 'os', name: 'Operating Systems', category: 'Core CS' },
  { id: 'dbms', name: 'Database Management Systems', category: 'Core CS' },
  { id: 'networks', name: 'Computer Networks', category: 'Core CS' },
  { id: 'toc', name: 'Theory of Computation', category: 'Core CS' },
  { id: 'compiler', name: 'Compiler Design', category: 'Core CS' },
  
  // Strong Subjects
  { id: 'algorithms', name: 'Algorithms', category: 'Data Structures & Algorithms' },
  { id: 'data_structures', name: 'Data Structures', category: 'Data Structures & Algorithms' },
  { id: 'programming', name: 'Programming (C)', category: 'Data Structures & Algorithms' },
];

const STRENGTHS = {
  strong: { label: 'Strong', color: 'bg-green-100', textColor: 'text-green-800' },
  moderate: { label: 'Moderate', color: 'bg-yellow-100', textColor: 'text-yellow-800' },
  weak: { label: 'Weak', color: 'bg-red-100', textColor: 'text-red-800' },
};

export default function PlanRequestModal({ isOpen, onClose, onSubmit }) {
  const [days, setDays] = useState(35);
  const [topicStrengths, setTopicStrengths] = useState(
    TOPICS.reduce((acc, topic) => {
      acc[topic.id] = topic.category === 'General Aptitude' ? 'moderate' : 'moderate';
      return acc;
    }, {})
  );
  const [loading, setLoading] = useState(false);

  const handleTopicStrengthChange = (topicId, strength) => {
    setTopicStrengths(prev => ({
      ...prev,
      [topicId]: strength
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (days < 7 || days > 120) {
      toast.error('Days must be between 7 and 120');
      return;
    }

    setLoading(true);
    try {
      const planData = {
        days,
        topicStrengths,
        requestedAt: new Date().toISOString(),
      };

      await onSubmit(planData);
      
      // Reset form
      setDays(35);
      setTopicStrengths(
        TOPICS.reduce((acc, topic) => {
          acc[topic.id] = topic.category === 'General Aptitude' ? 'moderate' : 'moderate';
          return acc;
        }, {})
      );
    } catch (error) {
      console.error('Error submitting plan request:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const groupedTopics = TOPICS.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = [];
    }
    acc[topic.category].push(topic);
    return acc;
  }, {});

  const strongCount = Object.values(topicStrengths).filter(s => s === 'strong').length;
  const weakCount = Object.values(topicStrengths).filter(s => s === 'weak').length;
  const moderateCount = Object.values(topicStrengths).filter(s => s === 'moderate').length;

  return (
    <div className="fixed inset-0 backdrop-blur flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Request Your Study Plan
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Days Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preparation Days Available
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="7"
                max="120"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="7"
                  max="120"
                  value={days}
                  onChange={(e) => setDays(Math.max(7, Math.min(120, parseInt(e.target.value) || 7)))}
                  className="w-16 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-center"
                />
                <span className="text-gray-600">days</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Recommended: 35 days for comprehensive preparation
            </p>
          </div>

          {/* Topic Strength Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Mark Your Topic Strengths
              </h3>
              <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Strong ({strongCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-600">Moderate ({moderateCount})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">Weak ({weakCount})</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedTopics).map(([category, topics]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                    {category}
                  </h4>
                  <div className="space-y-3">
                    {topics.map(topic => (
                      <div key={topic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <label className="text-sm font-medium text-gray-700">
                          {topic.name}
                        </label>
                        <div className="flex gap-2">
                          {Object.entries(STRENGTHS).map(([strength, config]) => (
                            <button
                              key={strength}
                              type="button"
                              onClick={() => handleTopicStrengthChange(topic.id, strength)}
                              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                topicStrengths[topic.id] === strength
                                  ? `${config.color} ${config.textColor} ring-2 ring-offset-2`
                                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {config.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Message */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Based on your preferences, a customized {days}-day study plan will be created focusing on weak areas while polishing your strong subjects.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating Plan...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
