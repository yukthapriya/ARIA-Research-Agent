// ── ARIA Paper Library ──
// Add your own papers here. Each paper object is passed to the agent pipeline.

const PAPERS = [
  {
    id: 'p1',
    title: 'Attention Is All You Need',
    authors: 'Vaswani et al.',
    year: 2017,
    venue: 'NeurIPS',
    field: 'deep-learning',
    abstract: 'We propose the Transformer, a model architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. The Transformer demonstrates superior performance on machine translation tasks while being more parallelizable and requiring significantly less training time. On WMT 2014 English-to-German, we achieve 28.4 BLEU, improving over the best existing results by over 2 BLEU.',
    keywords: ['transformers', 'attention', 'NLP', 'self-attention', 'encoder-decoder']
  },
  {
    id: 'p2',
    title: 'Language Models are Few-Shot Learners',
    authors: 'Brown et al.',
    year: 2020,
    venue: 'NeurIPS',
    field: 'NLP',
    abstract: 'GPT-3 with 175B parameters achieves strong few-shot performance across many NLP tasks, often surpassing fine-tuned models. We demonstrate that scaling language models greatly improves task-agnostic, few-shot performance, with performance improving smoothly with model scale. In-context learning emerges as a powerful paradigm without gradient updates.',
    keywords: ['GPT-3', 'few-shot learning', 'language models', 'scaling', 'in-context learning']
  },
  {
    id: 'p3',
    title: 'Constitutional AI: Harmlessness from AI Feedback',
    authors: 'Bai et al.',
    year: 2022,
    venue: 'Anthropic',
    field: 'AI-safety',
    abstract: 'We introduce Constitutional AI (CAI), a method for training harmless AI assistants using a set of principles and AI feedback. CAI enables training of AI systems that are helpful, harmless, and honest without relying on human labeling of harmful outputs. The method uses a set of natural language principles to guide revision and self-critique.',
    keywords: ['RLHF', 'AI safety', 'Constitutional AI', 'harmlessness', 'alignment']
  },
  {
    id: 'p4',
    title: 'Scaling Laws for Neural Language Models',
    authors: 'Kaplan et al.',
    year: 2020,
    venue: 'OpenAI',
    field: 'scaling',
    abstract: 'We study empirical scaling laws for language model performance on the cross-entropy loss. The loss scales as a power-law with model size, dataset size, and amount of compute. Transfer improves with scale. Overfitting is determined by the ratio of model parameters to data tokens. Optimal compute allocation requires scaling model size and data together.',
    keywords: ['scaling laws', 'compute', 'language models', 'power-law', 'Chinchilla']
  },
  {
    id: 'p5',
    title: 'Chain-of-Thought Prompting Elicits Reasoning in LLMs',
    authors: 'Wei et al.',
    year: 2022,
    venue: 'NeurIPS',
    field: 'reasoning',
    abstract: 'We explore how generating a chain of thought — a series of intermediate reasoning steps — significantly improves the ability of large language models to perform complex reasoning. Chain-of-thought prompting improves performance on arithmetic, commonsense, and symbolic reasoning tasks. The capability emerges naturally in large enough models.',
    keywords: ['chain-of-thought', 'reasoning', 'prompting', 'LLMs', 'emergent abilities']
  }
];
