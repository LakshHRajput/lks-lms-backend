import bcrypt from 'bcrypt';
import prisma from './src/config/database';

const api = 'http://localhost:5000/api/v1';

const adminRes = await fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin.user@example.com', password: 'Admin123!' })
});
const adminJson = await adminRes.json();
const adminToken = adminJson.data.accessToken;

const teacherUser = await prisma.user.upsert({
  where: { email: 'teacher.assignment@example.com' },
  update: {},
  create: {
    name: 'Teacher Assign',
    email: 'teacher.assignment@example.com',
    password: await bcrypt.hash('Teacher123!', 12),
    role: 'TEACHER',
    phone: '1111111111'
  }
});
const teacherProfile = await prisma.teacherProfile.upsert({
  where: { userId: teacherUser.id },
  update: {},
  create: {
    userId: teacherUser.id,
    employeeCode: 'EMP-104',
    qualification: 'M.Tech',
    specialization: 'Frontend',
    joiningDate: new Date()
  }
});

const studentUser = await prisma.user.upsert({
  where: { email: 'student.assignment@example.com' },
  update: {},
  create: {
    name: 'Student Assign',
    email: 'student.assignment@example.com',
    password: await bcrypt.hash('Student123!', 12),
    role: 'STUDENT',
    phone: '2222222222'
  }
});
const studentProfile = await prisma.studentProfile.upsert({
  where: { userId: studentUser.id },
  update: {},
  create: {
    userId: studentUser.id,
    studentCode: 'STD-204',
    admissionDate: new Date(),
    className: 'Class 10',
    section: 'A'
  }
});

const assignRes = await fetch(`${api}/teacher-subjects`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ teacherId: teacherProfile.id, subjectId: 1 })
});
const assignment = await assignRes.json();

const teacherLoginRes = await fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'teacher.assignment@example.com', password: 'Teacher123!' })
});
const teacherLogin = await teacherLoginRes.json();
const teacherToken = teacherLogin.data.accessToken;

const studentLoginRes = await fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'student.assignment@example.com', password: 'Student123!' })
});
const studentLogin = await studentLoginRes.json();
const studentToken = studentLogin.data.accessToken;

const enrollmentRes = await fetch(`${api}/enrollments`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ courseId: 1 })
});
const enrollment = await enrollmentRes.json();

const teacherAssignmentsRes = await fetch(`${api}/teacher-subjects?teacherId=${teacherProfile.id}&page=1&limit=10`, {
  headers: { Authorization: `Bearer ${teacherToken}` }
});
const teacherAssignments = await teacherAssignmentsRes.json();

const studentEnrollmentsRes = await fetch(`${api}/enrollments?courseId=1&page=1&limit=10`, {
  headers: { Authorization: `Bearer ${studentToken}` }
});
const studentEnrollments = await studentEnrollmentsRes.json();

const teacherEnrollmentsRes = await fetch(`${api}/enrollments?courseId=1&page=1&limit=10`, {
  headers: { Authorization: `Bearer ${teacherToken}` }
});
const teacherEnrollments = await teacherEnrollmentsRes.json();

console.log(JSON.stringify({
  assignment,
  enrollment,
  teacherAssignments,
  studentEnrollments,
  teacherEnrollments,
  teacherProfileId: teacherProfile.id,
  studentProfileId: studentProfile.id
}, null, 2));
