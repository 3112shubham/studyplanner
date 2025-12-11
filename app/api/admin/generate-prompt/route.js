import { GATE_CURRICULUM } from '@/lib/constants/gateCurriculum';

export async function POST(request) {
  try {
    const { days, topicStrengths } = await request.json();

    if (!days || !topicStrengths) {
      return Response.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate study plan based on topic strengths
    const studyPlan = generateStudyPlan(days, topicStrengths);

    // Generate GPT prompt
    const prompt = generateGPTPrompt(days, topicStrengths, studyPlan);

    return Response.json({
      success: true,
      prompt,
      studyPlan
    });

  } catch (error) {
    console.error('Generate prompt error:', error);
    return Response.json(
      { success: false, error: error.message || 'Failed to generate prompt' },
      { status: 400 }
    );
  }
}

function generateStudyPlan(totalDays, topicStrengths) {
  const studyPlan = {};
  let totalDaysAllocated = 0;

  // Allocate days based on importance and topic strength
  Object.entries(GATE_CURRICULUM).forEach(([subject, data]) => {
    const importance = data.importance_percent;
    
    // Calculate allocation based on importance
    let daysForSubject = Math.ceil((importance / 100) * totalDays);
    
    // Adjust based on strength (weak topics get more days)
    const averageStrength = calculateAverageStrength(topicStrengths, subject);
    
    if (averageStrength === 'weak') {
      daysForSubject = Math.ceil(daysForSubject * 1.3); // 30% more
    } else if (averageStrength === 'moderate') {
      daysForSubject = Math.ceil(daysForSubject * 1.1); // 10% more
    }
    
    studyPlan[subject] = {
      importance_percent: importance,
      allocated_days: daysForSubject,
      strength_level: averageStrength,
      topics: {}
    };

    // Allocate days to topics within subject
    let topicDaysUsed = 0;
    const topicsArray = Object.entries(data.topics);
    
    topicsArray.forEach(([topic, topicData], index) => {
      const isLastTopic = index === topicsArray.length - 1;
      let daysForTopic;
      
      if (isLastTopic) {
        daysForTopic = daysForSubject - topicDaysUsed;
      } else {
        daysForTopic = Math.ceil((topicData.weightage_percent / 100) * daysForSubject);
      }
      
      studyPlan[subject].topics[topic] = {
        weightage_percent: topicData.weightage_percent,
        allocated_days: daysForTopic,
        subtopics: topicData.subtopics
      };
      
      topicDaysUsed += daysForTopic;
    });

    totalDaysAllocated += daysForSubject;
  });

  return studyPlan;
}

function calculateAverageStrength(topicStrengths, subject) {
  // Map subjects to topic IDs
  const subjectMapping = {
    'General Aptitude': ['quantitative_aptitude', 'logical_reasoning', 'verbal_ability', 'reading_comprehension'],
    'Engineering Mathematics': ['linear_algebra', 'calculus', 'probability_stats', 'discrete_math_1', 'discrete_math_2'],
    'Digital Logic': ['digital_logic'],
    'Computer Organization & Architecture': ['coa'],
    'Programming & Data Structures': ['data_structures', 'programming'],
    'Algorithms': ['algorithms'],
    'Theory of Computation': ['toc'],
    'Compiler Design': ['compiler'],
    'Operating Systems': ['os'],
    'Databases': ['dbms'],
    'Computer Networks': ['networks']
  };

  const topicIds = subjectMapping[subject] || [];
  const strengths = topicIds.map(id => topicStrengths[id] || 'moderate');
  
  const weakCount = strengths.filter(s => s === 'weak').length;
  const strongCount = strengths.filter(s => s === 'strong').length;
  
  if (weakCount > strengths.length / 2) return 'weak';
  if (strongCount > strengths.length / 2) return 'strong';
  return 'moderate';
}

function generateGPTPrompt(days, topicStrengths, studyPlan) {
  // Create detailed curriculum with all topics, subtopics, weightage, and user strength levels
  const detailedCurriculum = {};
  
  Object.entries(GATE_CURRICULUM).forEach(([subject, data]) => {
    const subjectStrengthLevel = calculateAverageStrength(topicStrengths, subject);
    
    detailedCurriculum[subject] = {
      importance_percent: data.importance_percent,
      strength_level: subjectStrengthLevel,
      topics: {}
    };
    
    Object.entries(data.topics).forEach(([topic, topicData]) => {
      detailedCurriculum[subject].topics[topic] = {
        weightage_percent: topicData.weightage_percent,
        strength_level: subjectStrengthLevel,
        subtopics: topicData.subtopics
      };
    });
  });

  const prompt = `You are an expert GATE (Graduate Aptitude Test for Engineering) study planner. Generate a comprehensive, day-wise study plan in JSON format.

TOTAL PREPARATION DAYS: ${days}

SUBJECT-WISE BREAKDOWN (with importance, user's strength level, and topics):

${JSON.stringify(detailedCurriculum, null, 2)}

INSTRUCTIONS:
1. Create a detailed ${days}-day study plan
2. IMPORTANT: Include General Aptitude (all 3 topics: Verbal Ability, Numerical Ability, Logical Reasoning) in EVERY SINGLE DAY
3. General Aptitude daily prep_time_hours should be allocated based on user's strength level:
   * For WEAK strength: 1.5-2 hours per day
   * For MODERATE strength: 1-1.5 hours per day
   * For STRONG strength: 0.5-1 hour per day

4. For remaining time each day (after General Aptitude):
   - Cover other subjects based on their importance percentages
   - Allocate prep_time_hours for each subtopic based on its weightage and user's strength level:
     * For WEAK strength: More time (2-3 hours per subtopic)
     * For MODERATE strength: Balanced time (1.5-2 hours per subtopic)
     * For STRONG strength: Less time, focus on revision (0.5-1 hour per subtopic)
   - Total prep_time_hours per day should be 8-10 hours

5. Allocation strategy:
   - General Aptitude: MANDATORY EVERY DAY with strength-based time allocation
   - Balance other subjects based on importance
   - Allocate more time for weak subjects
   - Include mock tests periodically

REQUIRED JSON FORMAT (exact output structure):
{
  "day1": {
    "subjects": [
      {
        "name": "General Aptitude",
        "strength_level": "weak|moderate|strong",
        "topics": [
          {
            "name": "Verbal Ability",
            "weightage_percent": 7,
            "subtopics": [
              {
                "name": "Reading comprehension",
                "prep_time_hours": 0.5
              },
              {
                "name": "Synonyms & antonyms",
                "prep_time_hours": 0.3
              }
            ]
          },
          {
            "name": "Numerical Ability",
            "weightage_percent": 8,
            "subtopics": [
              {
                "name": "Arithmetic (Percentages, Ratios, Profit-Loss)",
                "prep_time_hours": 0.5
              }
            ]
          },
          {
            "name": "Logical Reasoning",
            "weightage_percent": 5,
            "subtopics": [
              {
                "name": "Series patterns",
                "prep_time_hours": 0.4
              }
            ]
          }
        ]
      },
      {
        "name": "Other Subject Name",
        "strength_level": "weak|moderate|strong",
        "topics": [
          {
            "name": "Topic Name",
            "weightage_percent": 4,
            "subtopics": [
              {
                "name": "Subtopic Name",
                "prep_time_hours": 2
              }
            ]
          }
        ]
      }
    ]
  },
  "day2": {
    ...
  },
  ...
  "day${days}": {
    ...
  }
}

CRITICAL REQUIREMENTS:
- Every day MUST include all 3 General Aptitude topics (Verbal Ability, Numerical Ability, Logical Reasoning)
- General Aptitude time allocation depends on user's strength level (provided above)
- Each subject should have "strength_level" field based on user's proficiency
- Include all subtopics from the curriculum for each topic studied that day
- Total prep_time_hours across all subjects on a day should be 8-10 hours
- Do not skip any days - generate exactly ${days} days

Generate the complete ${days}-day study plan in the exact JSON format specified above.`;

  return prompt;
}
