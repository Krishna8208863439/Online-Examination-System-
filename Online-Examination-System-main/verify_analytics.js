/**
 * Automated Verification Script for AeroGrade Exam Portal Relational DB & Analytics
 * Runs integration tests checking CRUD, Authentication, JWT RBAC, and the Analytics Engine.
 */
const http = require('http');

const API_BASE = 'http://localhost:5001/api';
const randSuffix = Math.random().toString(36).substr(2, 5);
const TEACHER_USERNAME = `teacher_verify_${randSuffix}`;
const STUDENT_USERNAME = `student_verify_${randSuffix}`;
const PASSWORD = 'password123';

// Helper to make JSON HTTP Requests
function request(url, method, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🚀 Starting integration tests...\n");

  try {
    // 1. Register a test Teacher
    console.log("Step 1: Registering test teacher...");
    const regTeacherRes = await request(`${API_BASE}/auth/register`, 'POST', {}, {
      username: TEACHER_USERNAME,
      password: PASSWORD,
      email: `${TEACHER_USERNAME}@sgi.edu`,
      role: 'Teacher',
      full_name: 'Verification Teacher',
      department: 'QA Testing'
    });
    
    if (regTeacherRes.statusCode !== 201 || !regTeacherRes.body.success) {
      throw new Error(`Failed to register teacher: ${JSON.stringify(regTeacherRes.body)}`);
    }
    console.log("✓ Teacher registered successfully.");

    // 2. Register a test Student
    console.log("Step 2: Registering test student...");
    const regStudentRes = await request(`${API_BASE}/auth/register`, 'POST', {}, {
      username: STUDENT_USERNAME,
      password: PASSWORD,
      email: `${STUDENT_USERNAME}@sgi.edu`,
      role: 'Student',
      full_name: 'Verification Student',
      student_id_card: `SGI-VERIFY-${randSuffix}`
    });
    
    if (regStudentRes.statusCode !== 201 || !regStudentRes.body.success) {
      throw new Error(`Failed to register student: ${JSON.stringify(regStudentRes.body)}`);
    }
    console.log("✓ Student registered successfully.");

    // 3. Login as Teacher to get JWT Token
    console.log("\nStep 3: Logging in as teacher...");
    const loginTeacherRes = await request(`${API_BASE}/auth/login`, 'POST', {}, {
      username: TEACHER_USERNAME,
      password: PASSWORD
    });

    if (loginTeacherRes.statusCode !== 200 || !loginTeacherRes.body.success) {
      throw new Error(`Failed to login teacher: ${JSON.stringify(loginTeacherRes.body)}`);
    }
    const teacherToken = loginTeacherRes.body.token;
    console.log("✓ Teacher logged in. Token acquired.");

    // 4. Login as Student to get JWT Token
    console.log("Step 4: Logging in as student...");
    const loginStudentRes = await request(`${API_BASE}/auth/login`, 'POST', {}, {
      username: STUDENT_USERNAME,
      password: PASSWORD
    });

    if (loginStudentRes.statusCode !== 200 || !loginStudentRes.body.success) {
      throw new Error(`Failed to login student: ${JSON.stringify(loginStudentRes.body)}`);
    }
    const studentToken = loginStudentRes.body.token;
    console.log("✓ Student logged in. Token acquired.");

    // 5. Create a new test question (RBAC Protected: Teacher only)
    console.log("\nStep 5: Creating test question using teacher token...");
    const createQuestionRes = await request(
      `${API_BASE}/questions`, 
      'POST', 
      { 'Authorization': `Bearer ${teacherToken}` }, 
      {
        question_text: `Test Question verification ${randSuffix}`,
        options: [
          { option_id: 'A', text: 'Correct Answer' },
          { option_id: 'B', text: 'Wrong Answer 1' },
          { option_id: 'C', text: 'Wrong Answer 2' },
          { option_id: 'D', text: 'Wrong Answer 3' }
        ],
        correct_option_id: 'A',
        category: 'Test Concept',
        explanation: 'This is a test explanation.',
        marks: 2,
        subject: 'Test Concept'
      }
    );

    if (createQuestionRes.statusCode !== 201 || !createQuestionRes.body.success) {
      throw new Error(`Failed to create question: ${JSON.stringify(createQuestionRes.body)}`);
    }
    const questionId = createQuestionRes.body.question.question_id;
    console.log(`✓ Question created successfully. ID: ${questionId}`);

    // 6. Test RBAC: Try to create a question using student token (Should fail with 403)
    console.log("Step 6: Testing RBAC. Student attempts to create a question (should fail)...");
    const badQuestionRes = await request(
      `${API_BASE}/questions`, 
      'POST', 
      { 'Authorization': `Bearer ${studentToken}` }, 
      {
        question_text: 'Intruder question',
        options: [{ option_id: 'A', text: 'A' }, { option_id: 'B', text: 'B' }],
        correct_option_id: 'A',
        category: 'Hacking',
        subject: 'Hacking'
      }
    );
    
    if (badQuestionRes.statusCode === 403) {
      console.log("✓ RBAC successfully blocked Student from creating a question (Status 403 Forbidden).");
    } else {
      throw new Error(`RBAC Failure! Student question post returned status ${badQuestionRes.statusCode}`);
    }

    // 7. Submit exam session 1 (Correct response)
    console.log("\nStep 7: Submitting Exam Session 1 (Student answers CORRECTLY)...");
    const sess1Id = `sess_1_${randSuffix}`;
    const submit1Res = await request(
      `${API_BASE}/exams`,
      'POST',
      { 'Authorization': `Bearer ${studentToken}` },
      {
        session_id: sess1Id,
        candidate_name: 'Verification Student',
        candidate_email: `${STUDENT_USERNAME}@sgi.edu`,
        student_id: `SGI-VERIFY-${randSuffix}`,
        category: 'Test Concept',
        duration: 10,
        proctoring: 'standard',
        score: 100,
        passed: true,
        correct_count: 1,
        incorrect_count: 0,
        unanswered_count: 0,
        total_count: 1,
        total_marks: 2,
        max_marks: 2,
        answers: {
          [questionId]: 'A' // Correct
        }
      }
    );

    if (submit1Res.statusCode !== 201 || !submit1Res.body.success) {
      throw new Error(`Failed to submit exam session 1: ${JSON.stringify(submit1Res.body)}`);
    }
    console.log("✓ Exam Session 1 submitted.");

    // 8. Submit exam session 2 (Incorrect response)
    console.log("Step 8: Submitting Exam Session 2 (Student answers INCORRECTLY)...");
    const sess2Id = `sess_2_${randSuffix}`;
    const submit2Res = await request(
      `${API_BASE}/exams`,
      'POST',
      { 'Authorization': `Bearer ${studentToken}` },
      {
        session_id: sess2Id,
        candidate_name: 'Verification Student',
        candidate_email: `${STUDENT_USERNAME}@sgi.edu`,
        student_id: `SGI-VERIFY-${randSuffix}`,
        category: 'Test Concept',
        duration: 10,
        proctoring: 'standard',
        score: 0,
        passed: false,
        correct_count: 0,
        incorrect_count: 1,
        unanswered_count: 0,
        total_count: 1,
        total_marks: 0,
        max_marks: 2,
        answers: {
          [questionId]: 'B' // Incorrect
        }
      }
    );

    if (submit2Res.statusCode !== 201 || !submit2Res.body.success) {
      throw new Error(`Failed to submit exam session 2: ${JSON.stringify(submit2Res.body)}`);
    }
    console.log("✓ Exam Session 2 submitted.");

    // 9. Fetch Teacher Analytics Engine report and verify success rate aggregation
    console.log("\nStep 9: Fetching Teacher Analytics to verify success rate computation...");
    const analyticsRes = await request(
      `${API_BASE}/analytics/question-performance`,
      'GET',
      { 'Authorization': `Bearer ${teacherToken}` }
    );

    if (analyticsRes.statusCode !== 200 || !analyticsRes.body.success) {
      throw new Error(`Failed to fetch analytics: ${JSON.stringify(analyticsRes.body)}`);
    }

    const questionStats = analyticsRes.body.analytics.find(q => q.question_id === questionId);
    
    if (!questionStats) {
      throw new Error(`Test question stats not found in aggregated report!`);
    }

    console.log("\n--- Aggregated Question Stats ---");
    console.log(`Question: ${questionStats.question_text}`);
    console.log(`Attempts: ${questionStats.total_attempts} (Expected: 2)`);
    console.log(`Correct:  ${questionStats.correct_count} (Expected: 1)`);
    console.log(`Success Rate: ${questionStats.success_rate}% (Expected: 50.00%)`);
    console.log("---------------------------------");

    if (questionStats.total_attempts === 2 && questionStats.correct_count === 1 && questionStats.success_rate === 50) {
      console.log("\n✅ SUCCESS: Teacher Analytics Engine calculated correct metrics successfully!");
    } else {
      throw new Error(`Aggregated success rate mismatch. Attempted: ${questionStats.total_attempts}, Correct: ${questionStats.correct_count}, Rate: ${questionStats.success_rate}`);
    }

    // 10. Clean up test questions
    console.log("\nStep 10: Cleaning up verification question from database...");
    const deleteRes = await request(
      `${API_BASE}/questions/${questionId}`,
      'DELETE',
      { 'Authorization': `Bearer ${teacherToken}` }
    );
    if (deleteRes.statusCode !== 200 || !deleteRes.body.success) {
      throw new Error(`Failed to delete verification question: ${JSON.stringify(deleteRes.body)}`);
    }
    console.log("✓ Cleanup finished successfully.");

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Relational DB, Auth, RBAC, and Aggregation Engine are 100% operational.");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ TEST FAILURE:", err.message);
    process.exit(1);
  }
}

// Check if server is running, then execute
const checkReq = http.request({ hostname: 'localhost', port: 5001, path: '/api/questions', method: 'GET' }, (res) => {
  runTests();
});
checkReq.on('error', (e) => {
  console.error("❌ Error: API server is offline! Start server.js first before running verification tests.");
  process.exit(1);
});
checkReq.end();
