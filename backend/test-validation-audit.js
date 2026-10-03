const fs = require('fs');
const path = require('path');
const { discoverSourceFiles } = require('./src/services/repositoryService');
const { buildRepositoryGraph } = require('./src/services/graphService');
const { calculateDataTrace, extractAvailableVariables } = require('./src/services/dataTraceEngine');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runAudit() {
  console.log('====================================================');
  console.log('FLOW-SIGHT VALIDATION & CORRECTNESS AUDIT SUITE');
  console.log('====================================================\n');

  // 1. MERN AUTHENTICATION REPOSITORY
  console.log('--- TEST 1: MERN Authentication Repository ---');
  const mernPath = path.resolve('./tests/fixtures/sample-mern');
  const mernFiles = await discoverSourceFiles(mernPath);
  const mernGraph = buildRepositoryGraph(mernFiles, 'MERN-Auth-App');
  const mernNodes = mernGraph.applicationFlow?.nodes || [];
  const mernEdges = mernGraph.applicationFlow?.edges || [];

  console.log(`MERN Semantic Nodes count: ${mernNodes.length}`);
  mernNodes.forEach((n, idx) => {
    console.log(` [${idx + 1}] Role: ${(n.type || '').padEnd(14)} | Label: "${n.semanticName}" | Inputs: [${(n.inputs || []).join(', ')}] | Outputs: [${(n.outputs || []).join(', ')}] | Tech: "${n.technicalName || ''}" | File: ${n.file}:${n.line}`);
  });

  console.log(`\nMERN Semantic Edges count: ${mernEdges.length}`);
  mernEdges.forEach((e, idx) => {
    const srcNode = mernNodes.find(n => n.id === e.source);
    const tgtNode = mernNodes.find(n => n.id === e.target);
    const dataStr = (e.dataItems || []).map(d => `${d.name} (${d.confidence?.level || 'CONFIRMED'})`).join(', ');
    console.log(` [${idx + 1}] "${srcNode?.semanticName}" -> "${tgtNode?.semanticName}" | Data: [${dataStr}]`);
  });

  // DATA TRACE VERIFICATION USING DIRECTED GRAPH TRAVERSAL
  console.log('\n--- DATA TRACE AUDIT: email, password, user, token ---');

  // TRACE 1: EMAIL
  const emailTrace = calculateDataTrace('email', mernNodes, mernEdges);
  console.log(`\n1. Trace for "email" (${emailTrace?.path?.length || 0} nodes):`);
  const emailLabels = emailTrace?.path?.map(n => n.semanticName) || [];
  emailLabels.forEach(lbl => console.log(`   -> "${lbl}"`));

  assert(emailLabels.length === 6, 'Email trace must have exactly 6 connected nodes');
  assert(emailLabels[0] === 'Login Page', 'Email trace starts at Login Page');
  assert(emailLabels[1] === 'Submit Login', 'Email trace flows to Submit Login');
  assert(emailLabels[2] === 'Login API', 'Email trace flows to Login API');
  assert(emailLabels[3] === 'Login Controller', 'Email trace flows to Login Controller');
  assert(emailLabels[4] === 'Authenticate User', 'Email trace flows to Authenticate User');
  assert(emailLabels[5] === 'Find User by Email', 'Email trace ends at Find User by Email');
  // Negative assertions
  assert(!emailLabels.includes('Verify Password'), 'NEGATIVE: Email trace must NOT include Verify Password');
  assert(!emailLabels.includes('Generate Login Token'), 'NEGATIVE: Email trace must NOT include Generate Login Token');
  assert(!emailLabels.includes('Authentication Failed'), 'NEGATIVE: Email trace must NOT include Authentication Failed');
  assert(!emailLabels.includes('Home Page'), 'NEGATIVE: Email trace must NOT include Home Page');

  // TRACE 2: PASSWORD
  const passwordTrace = calculateDataTrace('password', mernNodes, mernEdges);
  console.log(`\n2. Trace for "password" (${passwordTrace?.path?.length || 0} nodes):`);
  const passwordLabels = passwordTrace?.path?.map(n => n.semanticName) || [];
  passwordLabels.forEach(lbl => console.log(`   -> "${lbl}"`));

  assert(passwordLabels.length === 6, 'Password trace must have exactly 6 connected nodes');
  assert(passwordLabels[0] === 'Login Page', 'Password trace starts at Login Page');
  assert(passwordLabels[1] === 'Submit Login', 'Password trace flows to Submit Login');
  assert(passwordLabels[2] === 'Login API', 'Password trace flows to Login API');
  assert(passwordLabels[3] === 'Login Controller', 'Password trace flows to Login Controller');
  assert(passwordLabels[4] === 'Authenticate User', 'Password trace flows to Authenticate User');
  assert(passwordLabels[5] === 'Verify Password', 'Password trace ends at Verify Password');
  // Negative assertions
  assert(!passwordLabels.includes('Find User by Email'), 'NEGATIVE: Password trace must NOT include Find User by Email');
  assert(!passwordLabels.includes('Generate Login Token'), 'NEGATIVE: Password trace must NOT include Generate Login Token');
  assert(!passwordLabels.includes('Authentication Failed'), 'NEGATIVE: Password trace must NOT include Authentication Failed');
  assert(!passwordLabels.includes('Home Page'), 'NEGATIVE: Password trace must NOT include Home Page');

  // TRACE 3: USER (Normal YES Path)
  const userTrace = calculateDataTrace('user', mernNodes, mernEdges, { branch: 'YES' });
  console.log(`\n3. Trace for "user" [YES Branch] (${userTrace?.path?.length || 0} nodes):`);
  const userLabels = userTrace?.path?.map(n => n.semanticName) || [];
  userLabels.forEach(lbl => console.log(`   -> "${lbl}"`));

  assert(userLabels.length === 4, 'User YES-path trace must have exactly 4 connected nodes');
  assert(userLabels[0] === 'Find User by Email', 'User trace starts at Find User by Email');
  assert(userLabels[1] === 'Does User Exist?', 'User trace flows to Does User Exist?');
  assert(userLabels[2] === 'Verify Password', 'User trace flows to Verify Password (YES branch)');
  assert(userLabels[3] === 'Generate Login Token', 'User trace ends at Generate Login Token');
  // Negative assertions
  assert(!userLabels.includes('Authentication Failed'), 'NEGATIVE: User normal trace must NOT include Authentication Failed');
  assert(!userLabels.includes('Login Page'), 'NEGATIVE: User trace must NOT include Login Page');
  assert(!userLabels.includes('Login API'), 'NEGATIVE: User trace must NOT include Login API');

  // TRACE 3b: USER (Error NO Path)
  const userNoTrace = calculateDataTrace('user', mernNodes, mernEdges, { branch: 'NO' });
  console.log(`\n3b. Trace for "user" [NO Branch] (${userNoTrace?.path?.length || 0} nodes):`);
  const userNoLabels = userNoTrace?.path?.map(n => n.semanticName) || [];
  userNoLabels.forEach(lbl => console.log(`   -> "${lbl}"`));
  assert(userNoLabels.length === 3, 'User NO-path trace must have exactly 3 connected nodes');
  assert(userNoLabels[0] === 'Find User by Email', 'User NO-path starts at Find User by Email');
  assert(userNoLabels[1] === 'Does User Exist?', 'User NO-path flows to Does User Exist?');
  assert(userNoLabels[2] === 'Authentication Failed', 'User NO-path flows to Authentication Failed (NO branch)');
  assert(!userNoLabels.includes('Verify Password'), 'NEGATIVE: User NO-path must NOT include Verify Password');
  assert(!userNoLabels.includes('Generate Login Token'), 'NEGATIVE: User NO-path must NOT include Generate Login Token');

  // TRACE 4: TOKEN
  const tokenTrace = calculateDataTrace('token', mernNodes, mernEdges);
  console.log(`\n4. Trace for "token" (${tokenTrace?.path?.length || 0} nodes):`);
  const tokenLabels = tokenTrace?.path?.map(n => n.semanticName) || [];
  tokenLabels.forEach(lbl => console.log(`   -> "${lbl}"`));

  assert(tokenLabels.length === 4, 'Token trace must have exactly 4 connected nodes');
  assert(tokenLabels[0] === 'Generate Login Token', 'Token trace starts at Generate Login Token');
  assert(tokenLabels[1] === 'Login Response', 'Token trace flows to Login Response');
  assert(tokenLabels[2] === 'Go to Home Page', 'Token trace flows to Go to Home Page');
  assert(tokenLabels[3] === 'Home Page', 'Token trace ends at Home Page');
  // Negative assertions
  assert(!tokenLabels.includes('Find User by Email'), 'NEGATIVE: Token trace must NOT include Find User by Email');
  assert(!tokenLabels.includes('Submit Login'), 'NEGATIVE: Token trace must NOT include Submit Login');
  assert(!tokenLabels.includes('Verify Password'), 'NEGATIVE: Token trace must NOT include Verify Password');

  // 2. EXPRESS ONLY REPO (NO REACT)
  console.log('\n--- TEST 2: Express Only Repository (No React) ---');
  const expressPath = path.resolve('./tests/fixtures/express-only');
  const expressFiles = await discoverSourceFiles(expressPath);
  const expressGraph = buildRepositoryGraph(expressFiles, 'Express-Only-App');
  const expressNodes = expressGraph.applicationFlow?.nodes || [];
  console.log(`Express-only Semantic Nodes count: ${expressNodes.length}`);
  expressNodes.forEach(n => {
    console.log(` - Role: ${n.type} | Label: "${n.semanticName}"`);
  });
  const hasFakePage = expressNodes.some(n => n.type === 'PAGE');
  assert(!hasFakePage, 'Verified No Fake React Page in pure Backend repo');

  // 3. REACT ONLY REPO (CONSUMING APIS)
  console.log('\n--- TEST 3: React Only Repository (API consumer) ---');
  const reactPath = path.resolve('./tests/fixtures/react-only');
  const reactFiles = await discoverSourceFiles(reactPath);
  const reactGraph = buildRepositoryGraph(reactFiles, 'React-Only-App');
  const reactNodes = reactGraph.applicationFlow?.nodes || [];
  console.log(`React-only Semantic Nodes count: ${reactNodes.length}`);
  reactNodes.forEach(n => {
    console.log(` - Role: ${n.type} | Label: "${n.semanticName}"`);
  });
  const navNodes = reactNodes.filter(n => n.type === 'NAVIGATION');
  assert(navNodes.length > 0, 'React navigation detected from actual navigate() call');

  // 4. LARGE REPOSITORY (FLOWSIGHT BACKEND)
  console.log('\n--- TEST 4: Large Repository (FlowSight Backend Analysis) ---');
  const selfFiles = await discoverSourceFiles(path.resolve('.'));
  const selfGraph = buildRepositoryGraph(selfFiles, 'FlowSight-Backend');
  console.log(`Total Source Files Discovered: ${selfFiles.length}`);
  console.log(`L1 Application Flow Nodes: ${selfGraph.applicationFlow?.nodes?.length || 0}`);
  console.log(`L4 Technical AST Nodes (All Levels): ${selfGraph.nodes?.length || 0}`);
  assert(selfGraph.applicationFlow?.nodes?.length < 50, 'L1 semantic aggregation keeps node count readable');
  assert(selfGraph.nodes?.length > 1000, 'L4 code flow retains deep technical AST hierarchy');

  console.log('\n====================================================');
  console.log('ALL AUDIT TESTS & ASSERTIONS PASSED WITH ZERO ERRORS');
  console.log('====================================================');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
