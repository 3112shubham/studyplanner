export const GATE_CURRICULUM = {
  "General Aptitude": {
    importance_percent: 15,
    topics: {
      "Verbal Ability": {
        weightage_percent: 7,
        subtopics: [
          "Reading comprehension",
          "Synonyms & antonyms",
          "Sentence completion",
          "Para jumbles",
          "Grammar & error spotting"
        ]
      },
      "Numerical Ability": {
        weightage_percent: 8,
        subtopics: [
          "Arithmetic (Percentages, Ratios, Profit-Loss)",
          "Numbers & Number systems",
          "HCF/LCM",
          "Time, Speed & Distance",
          "Average, Mixture-Alligation",
          "Simple & Compound Interest"
        ]
      },
      "Logical Reasoning": {
        weightage_percent: 5,
        subtopics: [
          "Series patterns",
          "Directions",
          "Blood relations",
          "Data interpretation",
          "Logical puzzles"
        ]
      }
    }
  },
  "Engineering Mathematics": {
    importance_percent: 13,
    topics: {
      "Linear Algebra": {
        weightage_percent: 4,
        subtopics: [
          "Matrices & types",
          "Determinants",
          "Rank & inverse",
          "System of linear equations",
          "Eigenvalues & eigenvectors",
          "LU decomposition"
        ]
      },
      "Calculus": {
        weightage_percent: 3,
        subtopics: [
          "Limits & continuity",
          "Differentiability",
          "Maxima & minima",
          "Mean value theorem",
          "Definite & indefinite integration"
        ]
      },
      "Probability & Statistics": {
        weightage_percent: 4,
        subtopics: [
          "Random variables",
          "Distributions (normal, binomial, Poisson, uniform, exponential)",
          "Mean, median, mode",
          "Variance & standard deviation",
          "Conditional probability",
          "Bayes theorem"
        ]
      },
      "Discrete Mathematics": {
        weightage_percent: 6,
        subtopics: [
          "Propositional & first-order logic",
          "Sets, relations & functions",
          "Partial orders & lattices",
          "Groups & monoids",
          "Graph theory (connectivity, matching, coloring)",
          "Combinatorics (counting, permutations, combinations)",
          "Recurrence relations",
          "Generating functions"
        ]
      }
    }
  },
  "Digital Logic": {
    importance_percent: 6,
    topics: {
      "Boolean Algebra": {
        weightage_percent: 2,
        subtopics: [
          "Laws of Boolean algebra",
          "Canonical forms",
          "Karnaugh maps (K-maps)"
        ]
      },
      "Combinational Circuits": {
        weightage_percent: 2,
        subtopics: [
          "Adders, subtractors",
          "Multiplexers, demultiplexers",
          "Encoders, decoders",
          "Comparators"
        ]
      },
      "Sequential Circuits": {
        weightage_percent: 2,
        subtopics: [
          "Flip-flops (SR, JK, D, T)",
          "Registers & counters",
          "State diagrams",
          "Clocking & timing"
        ]
      }
    }
  },
  "Computer Organization & Architecture": {
    importance_percent: 8,
    topics: {
      "Machine Instructions": {
        weightage_percent: 2,
        subtopics: [
          "Instruction formats",
          "Addressing modes",
          "Assembly basics"
        ]
      },
      "Pipelining": {
        weightage_percent: 3,
        subtopics: [
          "Pipeline stages",
          "Data hazards",
          "Control hazards",
          "Structural hazards"
        ]
      },
      "Memory Hierarchy": {
        weightage_percent: 3,
        subtopics: [
          "Cache mapping (direct, associative, set-associative)",
          "Cache hit/miss",
          "Main memory",
          "Virtual memory"
        ]
      }
    }
  },
  "Programming & Data Structures": {
    importance_percent: 10,
    topics: {
      "C Programming": {
        weightage_percent: 3,
        subtopics: [
          "Pointers",
          "Arrays & strings",
          "Functions",
          "Structures",
          "Recursion"
        ]
      },
      "Data Structures": {
        weightage_percent: 4,
        subtopics: [
          "Arrays & linked lists",
          "Stacks & queues",
          "Trees & binary search trees",
          "Heaps",
          "Graphs (representation)"
        ]
      },
      "Complexity Basics": {
        weightage_percent: 3,
        subtopics: [
          "Time complexity",
          "Space complexity",
          "Best/worst/average cases"
        ]
      }
    }
  },
  "Algorithms": {
    importance_percent: 10,
    topics: {
      "Sorting & Searching": {
        weightage_percent: 3,
        subtopics: [
          "Merge sort",
          "Quick sort",
          "Heap sort",
          "Binary search"
        ]
      },
      "Graph Algorithms": {
        weightage_percent: 3,
        subtopics: [
          "BFS & DFS",
          "Minimum spanning trees (Kruskal, Prim)",
          "Shortest paths (Dijkstra, Bellman-Ford)"
        ]
      },
      "Algorithm Techniques": {
        weightage_percent: 4,
        subtopics: [
          "Greedy",
          "Dynamic programming",
          "Divide & conquer",
          "Backtracking"
        ]
      }
    }
  },
  "Theory of Computation": {
    importance_percent: 7,
    topics: {
      "Regular Languages & Automata": {
        weightage_percent: 3,
        subtopics: [
          "Finite automata (DFA, NFA)",
          "Regular expressions",
          "Pumping lemma"
        ]
      },
      "Context-Free Languages": {
        weightage_percent: 2,
        subtopics: [
          "CFG",
          "Parse trees",
          "Pushdown automata (PDA)"
        ]
      },
      "Turing Machines": {
        weightage_percent: 2,
        subtopics: [
          "Decidability",
          "Undecidability",
          "Reductions"
        ]
      }
    }
  },
  "Compiler Design": {
    importance_percent: 5,
    topics: {
      "Lexical Analysis": {
        weightage_percent: 1,
        subtopics: [
          "Tokenization",
          "Lexemes",
          "Finite automata behind lexers"
        ]
      },
      "Parsing": {
        weightage_percent: 2,
        subtopics: [
          "LL & LR parsing",
          "Parse trees",
          "Shift-reduce parsing"
        ]
      },
      "Code Generation & Optimization": {
        weightage_percent: 2,
        subtopics: [
          "Intermediate code",
          "Basic blocks",
          "Data flow analysis",
          "Constant propagation"
        ]
      }
    }
  },
  "Operating Systems": {
    importance_percent: 9,
    topics: {
      "Processes & Threads": {
        weightage_percent: 2,
        subtopics: [
          "PCB",
          "Context switching",
          "Multithreading"
        ]
      },
      "Scheduling": {
        weightage_percent: 2,
        subtopics: [
          "FCFS",
          "SJF",
          "Round Robin",
          "Priority scheduling"
        ]
      },
      "Concurrency": {
        weightage_percent: 3,
        subtopics: [
          "Semaphores",
          "Monitors",
          "Deadlock conditions",
          "Banker's algorithm"
        ]
      },
      "Memory Management": {
        weightage_percent: 2,
        subtopics: [
          "Paging & segmentation",
          "Page replacement (LRU, FIFO, Optimal)"
        ]
      }
    }
  },
  "Databases": {
    importance_percent: 8,
    topics: {
      "ER Model": {
        weightage_percent: 1,
        subtopics: ["ER diagrams", "Keys", "Relationships"]
      },
      "Relational Algebra & SQL": {
        weightage_percent: 3,
        subtopics: [
          "Selection & projection",
          "Joins",
          "Nested queries",
          "Aggregation"
        ]
      },
      "Normalization": {
        weightage_percent: 2,
        subtopics: [
          "Functional dependencies",
          "1NF → BCNF"
        ]
      },
      "Transactions": {
        weightage_percent: 2,
        subtopics: [
          "ACID",
          "Serializability",
          "Conflict graphs",
          "Concurrency control"
        ]
      }
    }
  },
  "Computer Networks": {
    importance_percent: 10,
    topics: {
      "Network Layers": {
        weightage_percent: 3,
        subtopics: [
          "OSI",
          "TCP/IP",
          "Encapsulation"
        ]
      },
      "IP Addressing": {
        weightage_percent: 3,
        subtopics: [
          "Subnetting",
          "CIDR",
          "IPv4 fragmentation"
        ]
      },
      "Routing": {
        weightage_percent: 2,
        subtopics: [
          "Link state",
          "Distance vector",
          "Dijkstra"
        ]
      },
      "Transport Layer": {
        weightage_percent: 2,
        subtopics: [
          "TCP",
          "UDP",
          "Flow control",
          "Congestion control"
        ]
      }
    }
  }
};
