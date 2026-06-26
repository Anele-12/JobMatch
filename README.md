# JobMatch
# Technical Programming 1(IP3)
# Data Squad


## Group Members

| Surname & Initials | Student Number |
|--------------------|----------------|
| Madide S.N. | 22314172 |
| Cebekhulu K.S. | 22322695 |
| Jingela A.O. | 22303495 |
| Lerara K. | 22344350 |

# Intelligent Job Matching and Recruitment System (JobMatch AI)

## 1. System Overview

### Purpose
The **Intelligent Job Matching and Recruitment System (JobMatch AI)** is a smart online recruitment platform designed to bridge the gap between graduates, final-year students, and employers. The system leverages Artificial Intelligence (AI) to optimize job matching, streamline the recruitment process, and reduce graduate unemployment.

### Target Users

**Candidates**
- Graduates seeking employment opportunities
- Final-year students preparing to enter the workforce

**Employers**
- Companies and organizations looking to hire qualified talent

### Core Value Proposition

#### For Candidates
- Personalized job recommendations
- AI-powered application assistance
- Profile optimization
- Intelligent job matching

#### For Employers
- Intelligent candidate screening
- Efficient applicant management
- Data-driven hiring decisions

---

# Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React.js with TypeScript |
| **Backend** | Node.js with Express |
| **Authentication** | Clerk |
| **Database** | Supabase (PostgreSQL) |
| **File Storage** | Supabase Storage |
| **AI/ML** | Groq AI |
| **Error Tracking** | Sentry |
| **Validation** | Zod |
| **Job Fetching** | RemoteOK API |

---

# Features

## Authentication & User Management

### Authentication
- Secure sign up and sign in
- Session management
- Account management
- Role-based access control

### User Roles

#### Candidate
- Browse jobs
- Apply for jobs
- Manage profile
- Upload CV
- Save jobs

#### Employer
- Post jobs
- Review applicants
- Manage applications
- Make hiring decisions

---

# Candidate Features

## Profile Management

Candidates can:

- Complete their professional profile
- Upload a profile picture
- Upload their CV
- Add and manage skills
- View profile completion score

### Profile Completion Score

The score is calculated based on:

- Required profile fields
- Skills added
- Education
- Work experience
- CV upload

---

## CV Upload & AI Processing

When a CV is uploaded, the AI automatically extracts:

- Skills
- Years of experience
- Job titles
- Education
- Professional information

### Benefits

- Faster profile creation
- Automated skill extraction
- Better job matching

---

## Skills Management

Features include:

- Manual skill addition
- Skill editing
- Skill deletion
- AI-generated skill suggestions

Skills are used for:

- Job matching
- AI screening
- Applicant comparison
- Profile completion scoring

---

## Job Search Dashboard

Users can filter jobs by:

- Keywords
- Source
- Salary
- Experience level
- Job type
- Skills

Additional features:

- Real-time job updates
- External job fetching
- Match percentage display

---

## Job Match Percentage

The AI calculates a match score using:

| Component | Weight |
|-----------|---------|
| Skills Match | **60%** |
| Experience Match | **30%** |
| Education Match | **10%** |

### Match Indicators

- **Green:** 70% or higher

- **Yellow:** 40%–69%

- **Red:** Below 40%

---

## Saved Jobs

Candidates can:

- Save jobs
- Remove saved jobs
- Access saved jobs later
- Track job availability

---

## Job Applications

Before applying, candidates should:

1. Complete their profile
2. Upload their CV
3. Add relevant skills

The AI screening provides:

- Match percentage
- Qualification result
- Matching skills
- Missing skills
- Experience feedback
- Education alignment
- Recommendation

---

## Application Management

Candidates can:

- View submitted applications
- Track application status
- View AI feedback
- Read employer messages
- Check interview dates

### Application Statuses

- Pending
- Under Review
- Shortlisted
- Interview Scheduled
- Interviewed
- Accepted
- Rejected
- Withdrawn

---

# Employer Features

## Job Posting

Employers can:

- Create jobs
- Edit jobs
- Delete jobs
- Mark jobs as filled
- Reopen jobs

### Required Fields

- Job Title
- Company
- Description
- Location
- Required Skills
- Experience
- Job Type

Salary is optional.

---

## Applicant Management

Employers can view:

- Candidate profile
- Profile picture
- Match score
- Skills
- Education
- CV
- Cover letter
- AI analysis

---

## Review Tools

Employers can:

- Add private notes
- Rate applicants
- Schedule interviews
- Draft messages
- Create email templates
- Update application status

---

## Applicant Comparison

Compare multiple candidates using:

- Match score
- Employer rating
- Experience
- Skills
- Missing skills
- Application status
- AI recommendations

---

# AI Features

## AI Chatbot

The AI assistant helps both candidates and employers.

### Candidate Assistance

- Improve match score
- Profile recommendations
- Interview preparation
- Application advice

### Employer Assistance

- Compare applicants
- Draft interview invitations
- Hiring recommendations
- Candidate evaluation

---

## AI Job Screening

The screening evaluates:

- Skills matching
- Experience
- Education
- Job description relevance

Output includes:

- Overall match percentage
- Qualification decision
- Matching skills
- Missing skills
- Experience feedback
- Recommendation

---

## Automated Skill Extraction

The AI automatically detects:

- Technical skills
- Soft skills
- Experience
- Job titles
- Education

---

## Match Score Formula

```text
Match Score =
(Skill Match × 0.6)
+ (Experience Match × 0.3)
+ (Education Match × 0.1)
```

---

# External Job Integration

## RemoteOK Integration

The system imports external jobs including:

- Job title
- Company
- Location
- Salary
- Skills
- Description
- Original job link

Jobs are refreshed:

- On backend startup
- Every 6 hours
- Manually by candidates

---

# Database

## Core Tables

- profiles
- candidate_skills
- jobs
- applications
- saved_jobs
- external_jobs

---

## Storage Buckets

### Private

- candidate-documents

### Public

- profile-images

---

# Error Handling

## Frontend

- Success notifications
- Error notifications
- Warning alerts
- Information messages

## Backend

- Structured JSON responses
- HTTP status codes
- Detailed debugging information

## Monitoring

Powered by **Sentry** for:

- Error tracking
- Performance monitoring
- Issue reporting

---

# Security

## Authentication

- Clerk Authentication
- Session management
- Role-based access control

## Data Security

- HTTPS encryption
- Supabase Row Level Security (RLS)
- Secure file storage
- Input validation using Zod

## API Security

- Protected endpoints
- Authentication required
- Role-based authorization
- Input sanitization
- Rate limiting

---

# API Endpoints

| Endpoint | Method | Purpose |
|-----------|--------|---------|
| `/api/profiles` | GET / POST | Profile management |
| `/api/skills` | GET / POST | Skill management |
| `/api/jobs` | GET / POST | Job listing and posting |
| `/api/applications` | GET / POST | Job applications |
| `/api/applications/:id/status` | PATCH | Update application status |
| `/api/applications/:id/review` | POST | Employer reviews |
| `/api/chat` | POST | AI chatbot |
| `/api/jobs/external/refresh` | POST | Refresh external jobs |

---

# Environment Variables

| Variable | Required | Description |
|-----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✓ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✓ | Clerk secret key |
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | Supabase service role key |
| `GROQ_API_KEY` | ✓ | Groq API key |
| `SENTRY_DSN` | Optional | Backend Sentry DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Frontend Sentry DSN |

---

# Conclusion

**JobMatch AI** is an AI-powered recruitment platform that modernizes the hiring process by connecting candidates with employers through intelligent job matching, automated CV analysis, applicant screening, and smart recruitment tools. By combining Artificial Intelligence with a modern web architecture, the platform provides a faster, more accurate, and efficient recruitment experience for both job seekers and employers.
