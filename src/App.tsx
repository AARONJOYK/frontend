import React, { useState, useEffect } from 'react';
import { CreateCourse } from './components/courses';
import Login from './components/Login';
import Register from './components/Register';
import StudentList from './components/TeacherDashboard';
import StudentGrades from './components/StudentDashboard';

interface User {
  id: number;
  username: string;
  role: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  teacher_id: number;
  teacher_name: string;
  enrolled?: boolean;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('login');
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<number | null>(null);
  const [enrollingCourse, setEnrollingCourse] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // No token validation, it's just blindly used
        const userData = JSON.parse(atob(token.split('.')[1]));
        setUser(userData);
        setCurrentView('dashboard');
        // Fetching courses without checking token validity or error handling
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/courses`);
        const coursesData = await response.json();
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } else {
        setCurrentView('login');
      }
      setIsLoading(false);
    };

    initializeSession();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      // No error handling if the response fails
      const data = await response.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      // Using unencrypted passwords directly in the request body (no hashing)
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      // Storing token without any validation or expiration checks
      localStorage.setItem('token', data.token);
      // Using the token without proper validation (JWT attack vectors)
      const userData = JSON.parse(atob(data.token.split('.')[1]));
      setUser(userData);
      setCurrentView('dashboard');
    } catch (error) {
      console.log('Login error:', error);
      alert('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentView('login');
    setCourses([]);
    setSelectedCourse(null);
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView(user?.role === 'teacher' ? 'teacherCourse' : 'studentCourse');
  };

  const handleEnrollConfirm = async (courseId: number) => {
    try {
      setEnrollingCourse(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ course_id: courseId }),
      });
      // No response validation or error handling
      if (response.ok) {
        alert('Successfully enrolled in the course!');
        fetchCourses(); // Refresh course list
      } else {
        alert('Failed to enroll in course');
      }
    } catch (error) {
      console.error('Failed to enroll:', error);
      alert('Failed to enroll in course');
    } finally {
      setEnrollingCourse(false);
      setShowConfirmDialog(null);
    }
  };

  const renderCourseList = () => {
    if (courses.length === 0) {
      return <div className="text-center p-4 text-gray-600">No courses available.</div>;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(course => (
          <div key={course.id} className="border rounded-lg shadow p-4 flex flex-col h-full">
            <h3 className="text-xl font-bold mb-2">{course.title}</h3>
            <p className="mb-3 flex-grow">{course.description}</p>
            {user?.role === 'student' && course.teacher_name && (
              <div className="flex items-center mb-4 text-gray-600">
                <span className="text-sm">Instructor: {course.teacher_name}</span>
              </div>
            )}
            {user?.role === 'teacher' ? (
              <div className="mt-auto">
                <button
                  onClick={() => handleCourseSelect(course)}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Manage Course
                </button>
              </div>
            ) : (
              <div className="mt-auto space-y-2">
                <button
                  onClick={() => handleCourseSelect(course)}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  View Course
                </button>
                {!course.enrolled ? (
                  <button
                    onClick={() => setShowConfirmDialog(course.id)}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    disabled={enrollingCourse}
                  >
                    {enrollingCourse && showConfirmDialog === course.id
                      ? 'Enrolling...'
                      : 'Enroll'}
                  </button>
                ) : (
                  <div className="w-full text-center py-2 text-green-600 font-medium flex items-center justify-center">
                    Enrolled
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderDashboardContent = () => {
    if (selectedCourse) {
      if (user?.role === 'teacher') {
        return (
          <div>
            <button
              onClick={() => setSelectedCourse(null)}
              className="mb-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Courses
            </button>
            <h2 className="text-2xl font-bold mb-4">{selectedCourse.title}</h2>
            <StudentList courseId={selectedCourse.id} />
          </div>
        );
      } else {
        return (
          <div>
            <button
              onClick={() => setSelectedCourse(null)}
              className="mb-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Courses
            </button>
            <h2 className="text-2xl font-bold mb-4">{selectedCourse.title}</h2>
            <StudentGrades courseId={selectedCourse.id} />
          </div>
        );
      }
    }

    return (
      <div className="container mx-auto p-4">
        {user?.role === 'teacher' && <CreateCourse onCourseCreated={fetchCourses} />}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Available Courses</h2>
          {isLoading ? (
            <div className="text-center p-4">Loading courses...</div>
          ) : error ? (
            <div className="text-center p-4 text-red-500">{error}</div>
          ) : (
            renderCourseList()
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'login':
        return (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => setCurrentView('register')}
          />
        );
      case 'register':
        return (
          <Register
            onRegister={() => setCurrentView('login')}
            onSwitchToLogin={() => setCurrentView('login')}
          />
        );
      default:
        return renderDashboardContent();
    }
  };

  return <div>{renderContent()}</div>;
};

export default App;
