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
1. Create a detailed ${days}-day study plan.

2. Each day MUST include subjects based on importance distribution.

3. Allocation rules:
   - Allocate each subtopic based on its weightage and user's strength level:
   - User should not be overloaded
   - You can club weak topics with strong

4. Allocation strategy:
   - Balance subjects based on importance percentages.
   - Cover all topics and subtopics across the full schedule.
   - All subjects must include the field "strength_level".
   - Include all subtopics for the topic chosen on a given day.

REQUIRED JSON FORMAT (exact output structure):
{
  "day1": {
    "subjects": [
      {
        "name": "Subject Name",
        "strength_level": "weak|moderate|strong",
        "topics": [
          {
            "name": "Topic Name",
            "weightage_percent": 4,
            "subtopics": [
              {
                "name": "Subtopic Name",
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
- Subjects should be divided across days while maintaining proportional importance
- If there are really less days to prepare then generate json that can have  multiple subject each day according to importance and weightage and logic
- If there are enough days(more than no. of subjects) then limit each day with single subject only
- Subjects must follow importance-based distribution.
- All chosen topics must list ALL their subtopics.
- Do not skip any days — generate exactly ${days} days.
- make sure i want all the data in single message in json format do not generate in batchers or multiple messages.

Generate the complete ${days}-day study plan directly in JSON format.11`;


  return prompt;
}
