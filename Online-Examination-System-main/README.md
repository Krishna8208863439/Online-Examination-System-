# Online Exam & Result Analytics System

A modern, responsive online examination system built with React.js featuring real-time timer, auto-grading, and performance analytics with interactive charts.

## Features

✅ **Student Login UI** - Clean and intuitive login interface
✅ **Question Bank** - 10 pre-loaded questions across multiple categories
✅ **Timer-Based Exam** - 10-minute countdown timer with visual alerts
✅ **Auto Result Page** - Instant grading and score calculation
✅ **Performance Graphs** - Interactive charts using Chart.js (Pie & Bar charts)
✅ **Responsive UI** - Works seamlessly on desktop, tablet, and mobile devices

## Technologies Used

- **React.js** - Frontend framework
- **JavaScript** - Programming language
- **Chart.js** - Data visualization library
- **react-chartjs-2** - React wrapper for Chart.js
- **CSS** - Styling and animations

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Login**: Enter your name and email to start the exam
2. **Take Exam**: Answer 10 questions within 10 minutes
3. **Navigate**: Use Previous/Next buttons or click question dots
4. **Submit**: Click "Submit Exam" or wait for timer to expire
5. **View Results**: See your score, category performance, and analytics charts
6. **Retake**: Click "Retake Exam" to try again

## Project Structure

```
src/
├── components/
│   ├── Login.js          # Student login component
│   ├── Login.css
│   ├── Exam.js           # Main exam interface
│   ├── Exam.css
│   ├── Timer.js          # Countdown timer
│   ├── Timer.css
│   ├── Results.js        # Results display
│   ├── Results.css
│   ├── PerformanceCharts.js  # Chart.js visualizations
│   └── PerformanceCharts.css
├── data/
│   └── questions.js      # Question bank
├── App.js                # Main app component
├── App.css
├── index.js
└── index.css
```

## Features in Detail

### Timer System
- 10-minute countdown timer
- Color-coded alerts (green → yellow → red)
- Auto-submit when time expires

### Question Navigation
- Previous/Next buttons
- Visual progress bar
- Question status indicators (answered/current)

### Results Analytics
- Overall score percentage
- Pass/Fail status (60% passing)
- Category-wise performance breakdown
- Interactive Pie chart (correct vs incorrect)
- Bar chart showing category scores

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## License

MIT
