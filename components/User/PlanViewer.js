import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function PlanViewer({ day, dayNumber, progress, onTopicCheck }) {
  // Track which subjects and topics are expanded
  const [expandedSubjects, setExpandedSubjects] = useState(
    day?.subtopics?.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {}) || {}
  );
  const [expandedTopics, setExpandedTopics] = useState({});

  // The day object has subtopics which is already parsed from JSON
  // subtopics is an array of subjects with their topics and subtopics
  const subjectsData = day?.subtopics;

  if (!day || !subjectsData || subjectsData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-600">No topics scheduled for this day</p>
      </div>
    );
  }

  const calculateDayProgress = () => {
    let total = 0;
    let completed = 0;

    subjectsData?.forEach((subject, subjectIdx) => {
      subject.topics?.forEach((topic, topicIdx) => {
        topic.subtopics?.forEach((subtopic, subtopicIdx) => {
          total++;
          const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIdx}_subtopic_${subtopicIdx}`;
          // Only count as completed if explicitly true
          if (progress[progressKey] === true) {
            completed++;
          }
        });
      });
    });

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const dayProgress = calculateDayProgress();
  const subjectsCount = subjectsData?.length || 0;

  return (
    <div className="space-y-6">
      {/* Day Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold mb-2">Day {dayNumber}</h2>
            <p className="text-blue-100">
              {day.title || `Study Day`}
            </p>
            <p className="text-sm text-blue-100 mt-2">{subjectsCount} subjects • {day.hours} hours</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold mb-2">{dayProgress}%</div>
            <p className="text-blue-100">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-blue-400 rounded-full h-3">
            <div
              className="bg-white h-3 rounded-full transition-all duration-500"
              style={{ width: `${dayProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Subjects and Topics */}
      <div className="space-y-6">
        {subjectsData?.map((subject, subjectIdx) => {
          const subjectTotal = subject.topics?.reduce((acc, topic) => 
            acc + (topic.subtopics?.length || 0), 0) || 0;
          
          const subjectCompleted = subject.topics?.reduce((acc, topic, topicIdx) => {
            const topicCount = topic.subtopics?.filter((subtopic, subtopicIdx) => {
              const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIdx}_subtopic_${subtopicIdx}`;
              // Only count as completed if explicitly true
              return progress[progressKey] === true;
            }).length || 0;
            return acc + topicCount;
          }, 0) || 0;

          return (
            <div
              key={subjectIdx}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Subject Header */}
              <div 
                onClick={() => setExpandedSubjects(prev => ({
                  ...prev,
                  [subjectIdx]: !prev[subjectIdx]
                }))}
                className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-l-4 border-blue-500 cursor-pointer hover:from-gray-100 hover:to-gray-150 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ChevronDown 
                      className={`h-5 w-5 text-gray-700 transition-transform ${
                        expandedSubjects[subjectIdx] ? 'rotate-0' : '-rotate-90'
                      }`}
                      strokeWidth={2.5}
                    />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{subject.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {subjectCompleted}/{subjectTotal} subtopics completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {subjectTotal > 0 ? Math.round((subjectCompleted / subjectTotal) * 100) : 0}%
                    </div>
                  </div>
                </div>

                {/* Subject Progress Bar */}
                {subjectTotal > 0 && (
                  <div className="mt-4 w-full bg-gray-300 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((subjectCompleted / subjectTotal) * 100)}%` }}
                    ></div>
                  </div>
                )}
              </div>

              {/* Topics */}
              {expandedSubjects[subjectIdx] && (
              <div className="p-6 space-y-4">
                {subject.topics?.map((topic, topicIdx) => {
                  const topicKey = `${subjectIdx}-${topicIdx}`;
                  const topicCompleted = topic.subtopics?.filter((subtopic, subtopicIdx) => {
                    const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIdx}_subtopic_${subtopicIdx}`;
                    return progress[progressKey] === true;
                  }).length || 0;
                  const topicTotal = topic.subtopics?.length || 0;

                  return (
                    <div key={topicIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div 
                        onClick={() => setExpandedTopics(prev => ({
                          ...prev,
                          [topicKey]: !prev[topicKey]
                        }))}
                        className="bg-gray-50 p-4 hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown 
                            className={`h-4 w-4 text-gray-600 transition-transform ${
                              expandedTopics[topicKey] ? 'rotate-0' : '-rotate-90'
                            }`}
                            strokeWidth={2.5}
                          />
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-xs">
                            {topicIdx + 1}
                          </span>
                          <span className="font-semibold text-gray-900">{topic.name}</span>
                          {topic.weightage_percent && (
                            <span className="text-xs font-normal bg-blue-100 text-blue-600 px-2 py-1 rounded ml-auto">
                              {topic.weightage_percent}%
                            </span>
                          )}
                          <span className="text-xs text-gray-600 ml-auto">
                            {topicCompleted}/{topicTotal}
                          </span>
                        </div>
                      </div>

                      {/* Subtopics with Checkboxes */}
                      {expandedTopics[topicKey] && (
                      <div className="space-y-3 p-4 ml-6">
                        {topic.subtopics?.map((subtopic, subtopicIdx) => {
                          const progressKey = `day_${dayNumber}_subject_${subjectIdx}_topic_${topicIdx}_subtopic_${subtopicIdx}`;
                          const isCompleted = progress[progressKey] === true;

                          return (
                            <label
                              key={subtopicIdx}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                            >
                              {/* Custom Checkbox */}
                              <div className="mt-1">
                                <input
                                  type="checkbox"
                                  checked={isCompleted}
                                  onChange={(e) =>
                                    onTopicCheck(
                                      dayNumber,
                                      subjectIdx,
                                      topicIdx,
                                      subtopicIdx,
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only"
                                />
                                <div
                                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                    isCompleted
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-gray-300 group-hover:border-blue-400'
                                  }`}
                                >
                                  {isCompleted && (
                                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                                  )}
                                </div>
                              </div>

                              {/* Subtopic Info */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium ${
                                    isCompleted
                                      ? 'text-gray-500 line-through'
                                      : 'text-gray-900'
                                  }`}
                                >
                                {subtopic.name}
                              </p>
                              {subtopic.prep_time_hours && (
                                <p className="text-xs text-gray-500 mt-1">
                                  ⏱️ {subtopic.prep_time_hours} hours
                                </p>
                              )}
                            </div>

                            {/* Status Badge */}
                            {isCompleted && (
                              <div className="flex-shrink-0 px-3 py-1 bg-green-100 rounded-full text-xs font-semibold text-green-700">
                                Done
                              </div>
                            )}
                          </label>
                          );
                        })}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Day Stats */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <p className="text-gray-600 text-sm font-medium">Total Subtopics</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {subjectsData?.reduce((acc, sub) => 
              acc + (sub.topics?.reduce((t, topic) => t + (topic.subtopics?.length || 0), 0) || 0), 0) || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <p className="text-gray-600 text-sm font-medium">Total Hours</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {day.hours || subjectsData?.reduce((acc, sub) => 
              acc + (sub.topics?.reduce((t, topic) => 
                t + (topic.subtopics?.reduce((s, sub) => s + (sub.prep_time_hours || 0), 0) || 0), 0) || 0), 0) || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <p className="text-gray-600 text-sm font-medium">Progress</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{dayProgress}%</p>
        </div>
      </div>
    </div>
  );
}
