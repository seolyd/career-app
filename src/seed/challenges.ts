import type { Challenge } from '../types'

/**
 * 챌린지는 LLM으로 생성하지 않습니다 — 좋은 문항을 미리 써두고 고르기만 하면
 * 되는 일에 매번 모델을 부를 이유가 없습니다. 선택 로직은 lib/challenge.ts에.
 */
export const SEED_CHALLENGES: Challenge[] = [
  /* ── Build vs Buy ─────────────────────────────────── */
  { id: 'bb1', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'Name one thing you are building yourself right now. Does a company sell it? For how much a year? If nobody sells it, why has nobody built it?' },
  { id: 'bb2', cadence: 'weekly', axis: 'Strategy', minutes: 40, prompt: 'Write, in one sentence, why your situation is special enough to build instead of buy. Does that sentence apply just as well to any other company?' },
  { id: 'bb3', cadence: 'weekly', axis: 'Strategy', minutes: 30, prompt: 'Write the three-year maintenance cost of what you are building. Who maintains it? What happens when you leave this team?' },
  { id: 'bb4', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'Is there anything you built this week that would have taken 30 minutes if you had bought it?' },
  { id: 'bb5', cadence: 'weekly', axis: 'Strategy', minutes: 30, prompt: 'One thing you decided to buy six months ago, one thing you decided to build. Deciding again today, which one flips?' },

  /* ── Data integration ─────────────────────────────── */
  { id: 'dt1', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'List every system where HR data currently lives. How many are there? If you lose count partway, that is today’s problem.' },
  { id: 'dt2', cadence: 'weekly', axis: 'Data', minutes: 45, prompt: 'Define "one person". When an applicant becomes an employee and later leaves, does your system know they are the same person?' },
  { id: 'dt3', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Write three questions you want integrated data to answer. How many can you answer today?' },
  { id: 'dt4', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Is there a system you decided NOT to integrate? Why? Does that reason still hold?' },
  { id: 'dt5', cadence: 'weekly', axis: 'Data', minutes: 30, prompt: 'Write the question your intelligence layer answers. What does the person receiving that answer do differently? If nothing changes, it is a report, not intelligence.' },

  /* ── AI features ──────────────────────────────────── */
  { id: 'ai1', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Pick one AI feature you shipped. When it is wrong, who finds out and when? If nobody does, it is not really shipped.' },
  { id: 'ai2', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Find one moment where a recruiter ignored an AI recommendation. Was ignoring it justified?' },
  { id: 'ai3', cadence: 'weekly', axis: 'Data', minutes: 30, prompt: 'Write the metric that tells you an AI feature is working. Is there a path where that metric improves while the experience gets worse?' },
  { id: 'ai4', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Name one thing that made a person trust an AI result. Was it shown reasoning, an undo, or just accuracy?' },
  { id: 'ai5', cadence: 'weekly', axis: 'Domain', minutes: 30, prompt: 'Name one judgment in hiring that AI must never make on our behalf. Write down exactly where you drew that line.' },

  /* ── Building alone ───────────────────────────────── */
  { id: 'so1', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'Is there code you shipped with Claude Code this week that you do not understand? Where?' },
  { id: 'so2', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'If you stopped building this tomorrow, what would remain? If nothing would, you are building too big.' },
  { id: 'so3', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'Did anyone disagree with your judgment this week? If not, is it because you were right or because there was nobody to ask?' },
  { id: 'so4', cadence: 'weekly', axis: 'People', minutes: 30, prompt: 'Write the real cost of having no team. What are you not learning right now?' },
  { id: 'so5', cadence: 'weekly', axis: 'Execution', minutes: 40, prompt: 'Name a system you built that has no documentation. Could anyone else take it over?' },

  /* ── Org and adoption ─────────────────────────────── */
  { id: 'or1', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Name one person blocking company-wide adoption. What are they afraid of losing?' },
  { id: 'or2', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Name a team that does not use what you built. Find one way their current method is better than yours.' },
  { id: 'or3', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'What is one question your manager did not ask you this week but should have?' },
  { id: 'or4', cadence: 'weekly', axis: 'Influence', minutes: 30, prompt: 'Explain your current work to your manager’s manager in three minutes. What do you lead with? If you led with features, write it again.' },
  { id: 'or5', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'Where do candidates wait longest in the hiring process? Is that wait caused by the system or by people?' },

  /* ── Domain depth (2026 goal 1) ───────────────────── */
  { id: 'dm1', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'One term from today’s work that you would not have known six months ago. Define it in three lines, as if explaining to a teammate.' },
  { id: 'dm2', cadence: 'weekly', axis: 'Domain', minutes: 40, prompt: 'List the HR data you are legally not allowed to touch. Name one landmine the feature you are building could step on.' },
  { id: 'dm3', cadence: 'weekly', axis: 'Domain', minutes: 45, prompt: 'Think of three people in Korea who know this space better than you. What do they know that you do not?' },
  { id: 'dm4', cadence: 'weekly', axis: 'Domain', minutes: 40, prompt: 'Spend 30 minutes inside a global Talent product. Find three decisions they made differently from you.' },
  { id: 'dm5', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'One rule that changed in this industry over the past year (regulation, platform policy, common practice). What constraint did it create for your product?' },

  /* ── Leadership principles (2026 goal 3) ──────────── */
  { id: 'lp1', cadence: 'weekly', axis: 'People', minutes: 30, prompt: 'Take one decision from this week and extract a rule: "I ___ when ___." That is a draft principle.' },
  { id: 'lp2', cadence: 'weekly', axis: 'People', minutes: 30, prompt: 'Find a decision this week where a leader you admire would have chosen differently. Is that a difference of principle or of information?' },
  { id: 'lp3', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'Did you postpone a conversation today because it was easier? Does postponing it match your principles?' },
  { id: 'lp4', cadence: 'weekly', axis: 'Influence', minutes: 30, prompt: 'Did you break one of your own principles this week? If breaking it was right, the principle needs rewriting.' },

  /* ── Product sense, general ───────────────────────── */
  { id: 'ps1', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Pick one backlog item and write three lines on what happens if you never build it.' },
  { id: 'ps2', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Copy down, word for word, the most uncomfortable sentence a user said this week. No summarizing.' },
  { id: 'ps3', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'One piece of scope you cut last week. Still the right call?' },
  { id: 'ps4', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Write the success metric for your current feature in one sentence, with a number and a date. If you cannot, write why you cannot.' },
  { id: 'ps5', cadence: 'weekly', axis: 'Product Sense', minutes: 45, prompt: 'Find a feature you built that nobody has used in four weeks. Why?' },

  /* ── Seeds for P4 ─────────────────────────────────── */
  { id: 'ou1', cadence: 'weekly', axis: 'Influence', minutes: 40, prompt: 'Pick one entry from this week that would be useful to someone outside your company. Strip the proper nouns and rewrite it in three paragraphs. Is it an article now?' },
  { id: 'ou2', cadence: 'weekly', axis: 'Influence', minutes: 30, prompt: 'Write one common misconception about "building internal systems alone with AI", then rebut it from your own experience.' },

  /* ── Product sense, deeper ────────────────────────── */
  { id: 'pn1', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Open the screen a recruiter uses most. Count the clicks to their most common task. Is any of those clicks yours to remove?' },
  { id: 'pn2', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Name one thing your product makes easy that should be hard. Mass-rejecting candidates is the obvious one — find yours.' },
  { id: 'pn3', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'A candidate drops out somewhere in the process. Which step? Did you learn that from data or from a person?' },
  { id: 'pn4', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'Write the sentence a user would say to explain your feature to a colleague. Is it the sentence you would have wanted?' },
  { id: 'pn5', cadence: 'daily', axis: 'Product Sense', minutes: 10, prompt: 'What is the smallest version of what you are building that someone would still use?' },
  { id: 'pn6', cadence: 'weekly', axis: 'Product Sense', minutes: 40, prompt: 'Watch a recruiter work for twenty minutes — live or a recording. List three things they did that you did not design for.' },
  { id: 'pn7', cadence: 'weekly', axis: 'Product Sense', minutes: 30, prompt: 'Pick a feature. If you had to delete every screen but one, which survives? What does that say about the rest?' },
  { id: 'pn8', cadence: 'weekly', axis: 'Product Sense', minutes: 30, prompt: 'Write down what your product refuses to do. If the list is empty, you have no point of view yet.' },
  { id: 'pn9', cadence: 'weekly', axis: 'Product Sense', minutes: 30, prompt: 'Take a complaint you dismissed as an edge case. Go count how many people are standing on that edge.' },
  { id: 'pn10', cadence: 'weekly', axis: 'Product Sense', minutes: 40, prompt: 'Describe the same feature as a candidate would, then a recruiter, then a hiring manager. Where do the three disagree?' },
  { id: 'pn11', cadence: 'weekly', axis: 'Product Sense', minutes: 30, prompt: 'Write the job your product is hired to do, in the user’s words rather than yours. Read it back — is it a job or a feature?' },

  /* ── Execution, deeper ────────────────────────────── */
  { id: 'en1', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'What did you ship this week that nobody asked for? Why did you build it?' },
  { id: 'en2', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'Name the oldest unfinished thing on your plate. What would it take to finish it or kill it today?' },
  { id: 'en3', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'Look at your last commit. Can you explain what it does in one sentence, without opening the diff?' },
  { id: 'en4', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'What are you doing by hand that you have now done more than three times?' },
  { id: 'en5', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'Is something blocked on another person right now? When did you last nudge it, and what did you say?' },
  { id: 'en6', cadence: 'daily', axis: 'Execution', minutes: 10, prompt: 'What is the riskiest assumption inside the thing you are building today?' },
  { id: 'en7', cadence: 'weekly', axis: 'Execution', minutes: 30, prompt: 'Cut what you are building in half. Write down what survives and what you just lost.' },
  { id: 'en8', cadence: 'weekly', axis: 'Execution', minutes: 40, prompt: 'List everything you personally maintain. Which one breaks first if you take two weeks off?' },
  { id: 'en9', cadence: 'weekly', axis: 'Execution', minutes: 40, prompt: 'Pick a system you built. Write the runbook for when it breaks at 2am. Three lines is a start.' },
  { id: 'en10', cadence: 'weekly', axis: 'Execution', minutes: 30, prompt: 'What did you plan to ship this month? What actually shipped? Where did the difference go?' },
  { id: 'en11', cadence: 'weekly', axis: 'Execution', minutes: 30, prompt: 'Find something you built that could be deleted. What is actually stopping you?' },
  { id: 'en12', cadence: 'weekly', axis: 'Execution', minutes: 40, prompt: 'Write the smallest change that would make your build-and-ship loop one step shorter. Then make it.' },

  /* ── Strategy, deeper ─────────────────────────────── */
  { id: 'sn1', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'Name one thing you decided not to do this quarter. Could you defend that in a review?' },
  { id: 'sn2', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'If your budget doubled, what would you buy first? If it halved, what dies first? The two answers should not be the same thing.' },
  { id: 'sn3', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'What would a competitor have to do to make your work irrelevant?' },
  { id: 'sn4', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'Name the assumption your roadmap rests on. What single fact would falsify it?' },
  { id: 'sn5', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'Which of your projects is most likely to be cancelled? Are you being honest with yourself about why?' },
  { id: 'sn6', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'What are you building that only matters if something else succeeds first? Is that thing on track?' },
  { id: 'sn7', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'Write the one-sentence case for your project that a finance person would accept.' },
  { id: 'sn8', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'Name something everyone in your org believes about HR tech. Is it still true, or just old?' },
  { id: 'sn9', cadence: 'daily', axis: 'Strategy', minutes: 10, prompt: 'If you handed your roadmap to someone else tomorrow, which item would they cut first?' },
  { id: 'sn10', cadence: 'weekly', axis: 'Strategy', minutes: 45, prompt: 'Write the three-year story of the system you are building. At what point does it stop being yours?' },
  { id: 'sn11', cadence: 'weekly', axis: 'Strategy', minutes: 30, prompt: 'Which decision this quarter is hardest to reverse? Is it getting attention proportional to that?' },
  { id: 'sn12', cadence: 'weekly', axis: 'Strategy', minutes: 40, prompt: 'Compare the cost of your time against the price of the tool you are replacing. Show the arithmetic.' },
  { id: 'sn13', cadence: 'weekly', axis: 'Strategy', minutes: 45, prompt: 'Pick one thing you built in-house. Write the memo arguing you should have bought it. Then decide whether you believe your own memo.' },

  /* ── Data, deeper ─────────────────────────────────── */
  { id: 'dn1', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Name a number you quote often. When did you last check how it is calculated?' },
  { id: 'dn2', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'What is your single most important number this quarter? Would your manager name the same one?' },
  { id: 'dn3', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Find a dashboard nobody opens. Why was it built, and what would have been better?' },
  { id: 'dn4', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Name a decision you made this week without data. Was the data available and you skipped it?' },
  { id: 'dn5', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'What would you need to know to say whether last month was good or bad? Do you have it?' },
  { id: 'dn6', cadence: 'daily', axis: 'Data', minutes: 10, prompt: 'Pick a metric. Name the way someone could move it without helping a single person.' },
  { id: 'dn7', cadence: 'weekly', axis: 'Data', minutes: 45, prompt: 'Trace one number end to end, from where it is generated to where it is displayed. Count the hops. Which hop would you not notice breaking?' },
  { id: 'dn8', cadence: 'weekly', axis: 'Data', minutes: 40, prompt: 'Write the three questions leadership asks most. Can your data answer them without a human assembling it?' },
  { id: 'dn9', cadence: 'weekly', axis: 'Data', minutes: 40, prompt: 'Find two systems that disagree about the same fact. Which is right, and who gets to decide that?' },
  { id: 'dn10', cadence: 'weekly', axis: 'Data', minutes: 45, prompt: 'Design the one report you would want if you were the CHRO. What is missing before you could build it?' },

  /* ── Influence, deeper ────────────────────────────── */
  { id: 'in1', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Who found out about your last decision only after it was made? Should they have been in it?' },
  { id: 'in2', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Name someone who could kill your project. When did you last speak to them?' },
  { id: 'in3', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'What is your manager worried about this month? If you cannot say, that is tomorrow’s first question.' },
  { id: 'in4', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Write your project status in three lines for someone who has never heard of it.' },
  { id: 'in5', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Who owes you something right now? Who do you owe? Which one have you been quieter about?' },
  { id: 'in6', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Name a recurring meeting you could leave. What would you do with that hour instead?' },
  { id: 'in7', cadence: 'daily', axis: 'Influence', minutes: 10, prompt: 'Whose approval are you assuming you already have?' },
  { id: 'in8', cadence: 'weekly', axis: 'Influence', minutes: 45, prompt: 'Write the one-page memo your manager could forward without editing a word.' },
  { id: 'in9', cadence: 'weekly', axis: 'Influence', minutes: 30, prompt: 'Pick a stakeholder who has gone quiet. Write what you think changed for them, then go find out how wrong you were.' },
  { id: 'in10', cadence: 'weekly', axis: 'Influence', minutes: 30, prompt: 'Map everyone who has to say yes before your next launch. Which of them have you not spoken to?' },
  { id: 'in11', cadence: 'weekly', axis: 'Influence', minutes: 40, prompt: 'Take one thing you learned this quarter that cost you a mistake. Write the paragraph that would spare someone else from it.' },

  /* ── People, deeper ───────────────────────────────── */
  { id: 'hn1', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'Who did you learn something from this week? Did you tell them?' },
  { id: 'hn2', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'If you were hiring your own replacement, what would the job description say? Read it back as a description of you.' },
  { id: 'hn3', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'Name someone whose work you would want to copy. What specifically — not the outcome, the habit.' },
  { id: 'hn4', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'What feedback did you get this year that you have still not acted on? Why that one?' },
  { id: 'hn5', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'Who in your org does something you do not understand? Ask them about it this week.' },
  { id: 'hn6', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'What would your manager name as your biggest weakness? Do you agree with them?' },
  { id: 'hn7', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'Name a moment this week you were the most knowledgeable person in the room. Was that a good sign?' },
  { id: 'hn8', cadence: 'daily', axis: 'People', minutes: 10, prompt: 'Who is not in the room when you make decisions about their work?' },
  { id: 'hn9', cadence: 'weekly', axis: 'People', minutes: 45, prompt: 'Write the case for hiring one person. What would you hand them on day one, and what would you be unable to hand over?' },
  { id: 'hn10', cadence: 'weekly', axis: 'People', minutes: 30, prompt: 'Draft the feedback you owe someone and have been avoiding. You do not have to send it today — you do have to write it.' },
  { id: 'hn11', cadence: 'weekly', axis: 'People', minutes: 40, prompt: 'Write how you would onboard someone into your project. Note exactly where you get stuck — that is what is only in your head.' },
  { id: 'hn12', cadence: 'weekly', axis: 'People', minutes: 30, prompt: 'Think of the best manager you have had. Name one thing they did that you do not.' },

  /* ── Domain, deeper ───────────────────────────────── */
  { id: 'mn1', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'Name a step in hiring that exists only because of a rule. Is that rule still in force?' },
  { id: 'mn2', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'What does a recruiter do on their worst day? Walk through it hour by hour.' },
  { id: 'mn3', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'Name a metric HR cares about that product people usually ignore. Why the gap?' },
  { id: 'mn4', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'What happens to a rejected candidate’s data? Do you know exactly, or roughly?' },
  { id: 'mn5', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'Name a stakeholder group inside HR you have never spoken to. What do they think of your product?' },
  { id: 'mn6', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'What is the gap between what your ATS records and what actually happened in the room?' },
  { id: 'mn7', cadence: 'daily', axis: 'Domain', minutes: 10, prompt: 'Name one thing about hiring that is true at your company but not elsewhere. Is it an advantage or an accident?' },
  { id: 'mn8', cadence: 'weekly', axis: 'Domain', minutes: 45, prompt: 'Read one piece on employment law or data protection in hiring. Write down what it constrains for you specifically.' },
  { id: 'mn9', cadence: 'weekly', axis: 'Domain', minutes: 45, prompt: 'Map one requisition end to end, from opening to close. Mark every place it stalls and who owns each stall.' },
  { id: 'mn10', cadence: 'weekly', axis: 'Domain', minutes: 40, prompt: 'Write what you would tell a PM joining HR tech on their first day — the things nobody writes down.' },
]
