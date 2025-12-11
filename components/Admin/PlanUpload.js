'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { Upload, Copy, Download, CheckCircle, XCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlanUpload({ userId, userEmail, userRequest, onPlanCreated }) {
  const { user } = useAuth();
  const [jsonData, setJsonData] = useState('');
  const [planName, setPlanName] = useState('');
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({ valid: false, errors: [] });

  const GPT_PROMPT = `Create a detailed ${userRequest?.daysAvailable || 35}-day GATE CS study plan in JSON format.

User Requirements:
- Total days: ${userRequest?.daysAvailable || 35}
- Daily study hours: ${userRequest?.dailyHours || 6}
- Weak topics count: ${userRequest?.topics?.filter(t => t.proficiency === 'weak').length || 0}
- Moderate topics count: ${userRequest?.topics?.filter(t => t.proficiency === 'moderate').length || 0}
- Strong topics count: ${userRequest?.topics?.filter(t => t.proficiency === 'strong').length || 0}

Output JSON structure:
{
  "planName": "GATE CS ${userRequest?.daysAvailable || 35}-Day Study Plan",
  "totalDays": ${userRequest?.daysAvailable || 35},
  "dailyHours": ${userRequest?.dailyHours || 6},
  "createdFor": "${userEmail}",
  "sections": [
    {
      "sectionId": "maths",
      "name": "Engineering Mathematics",
      "description": "Build strong foundation in core maths topics",
      "duration": "Days 1-5",
      "days": [
        {
          "day": 1,
          "title": "Linear Algebra",
          "topics": ["Matrix operations", "Determinants", "Eigenvalues"],
          "hours": 3,
          "pyqFocus": "1 hour PYQs on Linear Algebra",
          "subtopics": [
            {
              "id": "la-1",
              "name": "Matrix Types and Operations",
              "completed": false
            }
          ]
        }
      ]
    }
  ]
}

Requirements:
1. Allocate more time to weak subjects
2. Include daily PYQ practice
3. Include revision days every week
4. Include mock tests in final week
5. Balance theory and problem solving`;

  const validateJSON = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      const errors = [];

      if (!parsed.planName) errors.push('Missing planName');
      if (!parsed.totalDays) errors.push('Missing totalDays');
      if (!parsed.sections || !Array.isArray(parsed.sections)) {
        errors.push('Missing or invalid sections array');
      }

      setValidation({
        valid: errors.length === 0,
        errors
      });

      return errors.length === 0;
    } catch (error) {
      setValidation({
        valid: false,
        errors: ['Invalid JSON format: ' + error.message]
      });
      return false;
    }
  };

  const handleJSONChange = (e) => {
    const value = e.target.value;
    setJsonData(value);
    if (value.trim()) {
      validateJSON(value);
    }
  };

  const copyGPTPropmt = () => {
    navigator.clipboard.writeText(GPT_PROMPT);
    toast.success('GPT prompt copied to clipboard!');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        setJsonData(content);
        validateJSON(content);
        toast.success('File loaded successfully!');
      } catch (error) {
        toast.error('Error reading file');
      }
    };
    reader.readAsText(file);
  };

  const createPlan = async () => {
    if (!validation.valid) {
      toast.error('Please fix JSON validation errors first');
      return;
    }

    setLoading(true);
    try {
      const planData = JSON.parse(jsonData);
      
      const response = await fetch('/api/admin/create-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: user.uid,
          userId,
          userEmail,
          planName: planData.planName || planName,
          planData: planData,
          requestData: userRequest
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Plan created successfully!');
        if (onPlanCreated) onPlanCreated(result.planId);
      } else {
        toast.error(result.error || 'Failed to create plan');
      }
    } catch (error) {
      toast.error('Error creating plan');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = {
      planName: "GATE CS Study Plan",
      totalDays: 35,
      dailyHours: 6,
      createdFor: userEmail,
      sections: [
        {
          sectionId: "maths",
          name: "Engineering Mathematics",
          description: "Sample section",
          duration: "Days 1-5",
          days: [
            {
              day: 1,
              title: "Sample Topic",
              topics: ["Topic 1", "Topic 2"],
              hours: 3,
              pyqFocus: "1 hour PYQs",
              subtopics: [
                {
                  id: "sub-1",
                  name: "Sub topic 1",
                  completed: false
                }
              ]
            }
          ]
        }
      ]
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gate-plan-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Create Study Plan for {userEmail}
        </h2>
        <p className="text-gray-600
          Upload or create a JSON study plan
        </p>
      </div>

      {/* GPT Prompt Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-700">
            GPT Prompt for Plan Generation
          </h3>
          <button
            onClick={copyGPTPropmt}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Copy className="h-4 w-4" />
            <span>Copy Prompt</span>
          </button>
        </div>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-60">
          <pre className="whitespace-pre-wrap">{GPT_PROMPT}</pre>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Copy this prompt and use with ChatGPT/Claude to generate plan JSON
        </p>
      </div>

      {/* JSON Editor */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-700">
            Plan JSON Data
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center space-x-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Template</span>
            </button>
            <label className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>Upload JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        <div className="mb-3">
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Plan Name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 mb-2"
          />
          <textarea
            value={jsonData}
            onChange={handleJSONChange}
            placeholder="Paste your JSON plan here..."
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 font-mono text-sm"
            spellCheck="false"
          />
        </div>

        {/* Validation Status */}
        <div className={`p-4 rounded-lg ${validation.valid ? 'bg-green-50 : 'bg-red-50
          <div className="flex items-center space-x-2 mb-2">
            {validation.valid ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600 />
                <span className="font-medium text-green-600 JSON</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600 />
                <span className="font-medium text-red-600 JSON</span>
              </>
            )}
          </div>
          {validation.errors.length > 0 && (
            <ul className="text-sm text-red-600 space-y-1">
              {validation.errors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={downloadTemplate}
          className="btn-secondary flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Download Template</span>
        </button>
        <button
          onClick={createPlan}
          disabled={loading || !validation.valid || !jsonData.trim()}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
            loading || !validation.valid || !jsonData.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>{loading ? 'Creating...' : 'Create & Assign Plan'}</span>
        </button>
      </div>
    </div>
  );
}