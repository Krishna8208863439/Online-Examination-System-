export const questions = [
  {
    id: 1,
    question: "Which of the following is correct about JavaScript closures?",
    options: [
      "A closure is the combination of a function and the lexical environment within which that function was declared.",
      "A closure is a way to close browser windows programmatically.",
      "A closure is a secure hashing mechanism in ES6.",
      "A closure prevents any changes to the outer variables."
    ],
    answerIndex: 0,
    category: "JavaScript",
    marks: 1,
    subject: "Closures",
    explanation: "A closure is created when a inner function references variables from its outer (enclosing) scope even after the outer function has finished executing. The inner function retains access to the scope in which it was created."
  },
  {
    id: 2,
    question: "What is the primary purpose of React keys in lists?",
    options: [
      "To uniquely identify DOM nodes across the entire page.",
      "To help React identify which items have changed, been added, or been removed.",
      "To style list elements differently based on their positions.",
      "To encrypt the data sent to child components."
    ],
    answerIndex: 1,
    category: "React Development",
    marks: 1,
    subject: "React Lists & Keys",
    explanation: "Keys help React identify which items have changed, been added, or been removed. They should be given to elements inside the array to give the elements a stable identity, ensuring optimal virtual DOM diffing performance."
  },
  {
    id: 3,
    question: "In CSS Flexbox, which property is used to control how items shrink?",
    options: [
      "flex-grow",
      "flex-shrink",
      "flex-basis",
      "align-self"
    ],
    answerIndex: 1,
    category: "CSS & Layout",
    marks: 1,
    subject: "Flexbox Layout",
    explanation: "The 'flex-shrink' CSS property specifies the flex shrink factor of a flex item. If the size of all flex items is larger than the flex container, items shrink to fit according to flex-shrink."
  },
  {
    id: 4,
    question: "What does the 'crossorigin' attribute in a <script> tag do?",
    options: [
      "Allows the script to execute on multiple CPU cores.",
      "Enables error logging for scripts loaded from different origins.",
      "Tells the browser to block scripts loaded over HTTP.",
      "Executes the script only when the cursor crosses the screen."
    ],
    answerIndex: 1,
    category: "General Web Architecture",
    marks: 1,
    subject: "CORS Scripting",
    explanation: "The 'crossorigin' attribute allows error logging for third-party scripts. Without it, errors in external scripts are caught as generic 'Script error.' due to security restrictions."
  },
  {
    id: 5,
    question: "What is the difference between '==' and '===' operators in JavaScript?",
    options: [
      "'==' compares only values after type coercion, while '===' compares both value and type without coercion.",
      "'===' compares only values after coercion, while '==' compares values and types.",
      "There is no difference; they are completely interchangeable.",
      "'==' is used for strings and '===' is used for numbers."
    ],
    answerIndex: 0,
    category: "JavaScript",
    marks: 1,
    subject: "Coercion & Equality",
    explanation: "The strict equality operator ('===') does not perform type conversion. It only returns true if both operands have the same value and type. The loose equality operator ('==') performs type coercion before comparison."
  },
  {
    id: 6,
    question: "What does HTML5 Semantics refer to?",
    options: [
      "Using CSS inline styles to make HTML pages load faster.",
      "Using tag names that clearly describe their meaning to both the browser and the developer (e.g., <article>, <header>).",
      "Writing JavaScript code directly inside HTML attributes.",
      "Developing pages that only load on mobile browsers."
    ],
    answerIndex: 1,
    category: "General Web Architecture",
    marks: 1,
    subject: "HTML5 Semantics",
    explanation: "Semantic HTML elements clearly describe their meaning in a human- and machine-readable way. Examples of non-semantic elements: <div> and <span>. Examples of semantic elements: <form>, <table>, <article>, <section>."
  },
  {
    id: 7,
    question: "Which React hook is used to run side effects in a functional component?",
    options: [
      "useState",
      "useContext",
      "useEffect",
      "useReducer"
    ],
    answerIndex: 2,
    category: "React Development",
    marks: 1,
    subject: "React Side Effects",
    explanation: "The 'useEffect' Hook lets you perform side effects in function components. Side effects include data fetching, subscriptions, manual DOM changes, timers, etc."
  },
  {
    id: 8,
    question: "In CSS, what is the default value of the 'position' property?",
    options: [
      "relative",
      "absolute",
      "fixed",
      "static"
    ],
    answerIndex: 3,
    category: "CSS & Layout",
    marks: 1,
    subject: "CSS Positioning",
    explanation: "HTML elements are positioned static by default. Static positioned elements are not affected by the top, bottom, left, and right properties; they always position according to the normal flow of the page."
  },
  {
    id: 9,
    question: "What is Event Bubbling in JavaScript?",
    options: [
      "A technique to compress event listener memory usage.",
      "An event propagation mechanism where an event triggers on the deepest target element first and then triggers on its parents.",
      "A bug where events loop infinitely and crash the tab.",
      "An API for animation bubbles on mouse hover."
    ],
    answerIndex: 1,
    category: "JavaScript",
    marks: 1,
    subject: "Event Propagation",
    explanation: "Event bubbling is a type of event propagation where the event first triggers on the innermost target element, and then successively triggers on the ancestors (parents) of the target element in the DOM tree."
  },
  {
    id: 10,
    question: "Which of the following is true about React state updates?",
    options: [
      "State updates are synchronous and occur immediately on the next line.",
      "State updates may be batched and are asynchronous for performance reasons.",
      "State can only be modified by changing the window global object directly.",
      "State updates force the entire browser page to reload."
    ],
    answerIndex: 1,
    category: "React Development",
    marks: 1,
    subject: "React State Updates",
    explanation: "React batches state updates to group multiple updates into a single re-render for better performance. Because of this, state updates are asynchronous and state values are not immediately reflected on the next line after calling the setter."
  },
  {
    id: 11,
    question: "In CSS, what does 'box-sizing: border-box' do?",
    options: [
      "Forces a solid border around the target element.",
      "Includes padding and border in the element's total width and height.",
      "Hides the content of the box if it overflows the border.",
      "Sets the element's width and height to zero."
    ],
    answerIndex: 1,
    category: "CSS & Layout",
    marks: 1,
    subject: "Box Model",
    explanation: "With 'box-sizing: border-box', the width and height properties include the content, padding, and border. This makes layout sizing much more intuitive and predictable."
  },
  {
    id: 12,
    question: "What does the 'DNS' (Domain Name System) do?",
    options: [
      "Translates human-readable domain names (like google.com) to machine-readable IP addresses (like 142.250.190.46).",
      "Encrypts the local network connection against hackers.",
      "Speeds up local CPU execution when playing web browser games.",
      "Converts HTML stylesheets into JavaScript arrays."
    ],
    answerIndex: 0,
    category: "General Web Architecture",
    marks: 1,
    subject: "Internet DNS System",
    explanation: "DNS acts as the phonebook of the internet. Humans access information online through domain names. Web browsers interact through Internet Protocol (IP) addresses. DNS translates domain names to IP addresses so browsers can load resources."
  }
];
