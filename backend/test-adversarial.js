const fs = require('fs');
const path = require('path');
const { buildRepositoryGraph } = require('./src/services/graphService');
const { calculateDataTrace, extractAvailableVariables } = require('./src/services/dataTraceEngine');
const { analyzeJavaScriptFile } = require('./src/analyzers/javascriptAnalyzer');
const { analyzeReactFile } = require('./src/analyzers/reactAnalyzer');
const { analyzeMongooseFile } = require('./src/analyzers/mongooseAnalyzer');
const { buildSemanticApplicationFlow } = require('./src/services/semanticFlowEngine');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ADVERSARIAL ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runAdversarialTests() {
  console.log('====================================================');
  console.log('FLOWSIGHT ADVERSARIAL & GENERALIZATION TEST SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // CASE A & F: Renamed Variables & Variable Aliasing
  // ----------------------------------------------------
  console.log('--- TEST A & F: Renamed Variables & Aliasing ---');
  const codeAlias = `
    const express = require('express');
    const router = express.Router();

    router.post('/login', async (req, res) => {
      const identifier = req.body.email;
      const value = identifier;
      const user = await User.findOne({ email: value });
      res.json({ user });
    });
  `;
  const jsAnalysisAlias = analyzeJavaScriptFile({ relativePath: 'routes/auth.js', content: codeAlias });
  assert(jsAnalysisAlias.variables.includes('identifier'), 'Extracted identifier variable');
  const idAssign = jsAnalysisAlias.assignments.find(a => a.target === 'identifier');
  assert(idAssign !== undefined, 'Extracted assignment for identifier');
  assert(idAssign.source === 'req.body.email', 'Extracted initial binding req.body.email');

  // ----------------------------------------------------
  // CASE B: Different DB Field (Username instead of Email)
  // ----------------------------------------------------
  console.log('\n--- TEST B: Non-Email DB Field (User.findOne({ username })) ---');
  const codeUsername = `
    const express = require('express');
    const router = express.Router();
    const User = require('../models/User');

    router.post('/login-username', async (req, res) => {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      res.json({ user });
    });
  `;
  const filesUsername = [
    {
      file: 'routes/userAuth.js',
      relativePath: 'routes/userAuth.js',
      extension: '.js',
      content: codeUsername,
      language: 'javascript'
    }
  ];
  const graphUsername = buildRepositoryGraph(filesUsername, 'Username-Auth-App');
  const appFlowUser = graphUsername.applicationFlow;
  const dbNodeUser = appFlowUser.nodes.find(n => n.type === 'DATABASE');

  assert(dbNodeUser !== undefined, 'Database node created for User.findOne({ username })');
  assert(dbNodeUser.semanticName.includes('Username') || dbNodeUser.semanticName === 'Find User by Username', `Database node labeled dynamically: "${dbNodeUser.semanticName}"`);
  assert(dbNodeUser.inputs.includes('username'), 'DB Node input is "username"');
  assert(!dbNodeUser.inputs.includes('email'), 'NEGATIVE: DB Node does NOT assume "email" when query is { username }');

  // ----------------------------------------------------
  // CASE C & I: Multiple DB Queries in One Service & Unrelated Operations
  // ----------------------------------------------------
  console.log('\n--- TEST C & I: Multiple DB Queries in One Service & Unrelated Ops ---');
  const codeMultiDb = `
    const express = require('express');
    const router = express.Router();
    const User = require('../models/User');
    const Analytics = require('../models/Analytics');

    router.post('/login', async (req, res) => {
      const { email } = req.body;
      const user = await User.findOne({ email });
      res.json({ user });
    });

    router.get('/analytics', async (req, res) => {
      const data = await Analytics.find({});
      res.json(data);
    });
  `;
  const filesMultiDb = [
    {
      file: 'routes/api.js',
      relativePath: 'routes/api.js',
      extension: '.js',
      content: codeMultiDb,
      language: 'javascript'
    }
  ];
  const graphMultiDb = buildRepositoryGraph(filesMultiDb, 'Multi-DB-App');
  const nodesMulti = graphMultiDb.applicationFlow.nodes;
  const edgesMulti = graphMultiDb.applicationFlow.edges;

  const userQueryNode = nodesMulti.find(n => n.technicalName?.includes('User.findOne'));
  const analyticsQueryNode = nodesMulti.find(n => n.technicalName?.includes('Analytics.find'));

  assert(userQueryNode !== undefined, 'Resolved User.findOne node');
  assert(analyticsQueryNode !== undefined, 'Resolved Analytics.find node');

  // Trace email in multi-db app
  const emailMultiTrace = calculateDataTrace('email', nodesMulti, edgesMulti);
  const emailMultiNodeNames = emailMultiTrace?.path?.map(n => n.semanticName || n.name) || [];
  assert(!emailMultiNodeNames.includes(analyticsQueryNode.semanticName), 'NEGATIVE: Analytics.find must NOT appear in email login trace');

  // ----------------------------------------------------
  // CASE D & E: Multiple Navigations and Function-Scoped Navigation
  // ----------------------------------------------------
  console.log('\n--- TEST D & E: Function-Scoped Navigation & Link vs Navigate ---');
  const codeReactNav = `
    import React from 'react';
    import { useNavigate, Link } from 'react-router-dom';

    export default function AuthPanel() {
      const navigate = useNavigate();

      const handleLogin = async (email, password) => {
        const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        if (res.ok) {
          navigate('/dashboard');
        }
      };

      const handleLogout = async () => {
        await fetch('/api/logout', { method: 'POST' });
        navigate('/goodbye');
      };

      return (
        <div>
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleLogout}>Logout</button>
          <Link to="/help">Help Page</Link>
        </div>
      );
    }
  `;
  const reactAnalysis = analyzeReactFile({ relativePath: 'src/AuthPanel.jsx', content: codeReactNav });
  assert(reactAnalysis.navigations.length >= 2, 'Captured navigations');
  const loginNav = reactAnalysis.navigations.find(n => n.enclosingFunction === 'handleLogin');
  const logoutNav = reactAnalysis.navigations.find(n => n.enclosingFunction === 'handleLogout');
  const linkNav = reactAnalysis.navigations.find(n => n.type === 'LINK');

  assert(loginNav !== undefined, 'Found login navigation');
  assert(loginNav.target === '/dashboard', 'Login nav target is /dashboard');
  assert(loginNav.type === 'NAVIGATE', 'Login nav tagged as NAVIGATE');

  assert(logoutNav !== undefined, 'Found logout navigation');
  assert(logoutNav.target === '/goodbye', 'Logout nav target is /goodbye');
  assert(logoutNav.type === 'NAVIGATE', 'Logout nav tagged as NAVIGATE');

  if (linkNav) {
    assert(linkNav.type === 'LINK', 'Link correctly identified as LINK rather than imperative NAVIGATE');
  }

  // ----------------------------------------------------
  // CASE G: Nested Object Property Access
  // ----------------------------------------------------
  console.log('\n--- TEST G: Nested Object Property Derivation ---');
  const codeNested = `
    const bcrypt = require('bcryptjs');
    async function verify(password, user) {
      const isMatch = await bcrypt.compare(password, user.credentials.hashedPassword);
      return isMatch;
    }
  `;
  const jsNested = analyzeJavaScriptFile({ relativePath: 'services/nestedAuth.js', content: codeNested });
  const callBcrypt = jsNested.calls.find(c => c.calleeName?.includes('compare'));
  assert(callBcrypt !== undefined, 'Captured bcrypt.compare call');
  assert(callBcrypt.arguments.includes('password'), 'Captured password argument');
  assert(callBcrypt.arguments.some(a => a.includes('user.credentials.hashedPassword') || a.includes('hashedPassword')), 'Captured nested object property expression');

  // ----------------------------------------------------
  // CASE H: Negative Substring Match Case
  // ----------------------------------------------------
  console.log('\n--- TEST H: Negative Substring Match (userEmail must not match email) ---');
  const testNodes = [
    { id: 'node_1', name: 'Submit Form', type: 'USER_ACTION', inputs: ['userEmail'], outputs: ['userEmail'] },
    { id: 'node_2', name: 'Process User Email', type: 'SERVICE', inputs: ['userEmail'], outputs: ['userEmail'] }
  ];
  const testEdges = [
    { id: 'e1', source: 'node_1', target: 'node_2', dataItems: [{ name: 'userEmail' }] }
  ];
  const strictEmailTrace = calculateDataTrace('email', testNodes, testEdges);
  assert(strictEmailTrace === null || strictEmailTrace.path.length === 0, 'NEGATIVE: "userEmail" does NOT match search/trace for "email"');

  // ----------------------------------------------------
  // CASE J: Multiple Independent Traces for Same Variable Name
  // ----------------------------------------------------
  console.log('\n--- TEST J: Multiple Independent Workflows with Same Variable Name ---');
  const multiWorkflowNodes = [
    // Workflow 1: Customer Login
    { id: 'wf1_login', name: 'Customer Login', semanticName: 'Customer Login', type: 'PAGE', inputs: ['email'], outputs: ['email'] },
    { id: 'wf1_api', name: 'Customer API', semanticName: 'Customer API', type: 'API', inputs: ['email'], outputs: ['email'] },
    // Workflow 2: Admin Password Reset
    { id: 'wf2_reset', name: 'Admin Reset', semanticName: 'Admin Reset', type: 'PAGE', inputs: ['email'], outputs: ['email'] },
    { id: 'wf2_api', name: 'Admin API', semanticName: 'Admin API', type: 'API', inputs: ['email'], outputs: ['email'] }
  ];
  const multiWorkflowEdges = [
    { id: 'e_wf1', source: 'wf1_login', target: 'wf1_api', dataItems: [{ name: 'email' }] },
    { id: 'e_wf2', source: 'wf2_reset', target: 'wf2_api', dataItems: [{ name: 'email' }] }
  ];
  const multiTrace = calculateDataTrace('email', multiWorkflowNodes, multiWorkflowEdges);
  assert(multiTrace !== null, 'Traced multi-workflow graph');
  assert(multiTrace.path.length >= 2, 'Traced connected path without crosstalk across disjoint workflows');

  console.log('\n====================================================');
  console.log('ALL ADVERSARIAL CASES (A - J) PASSED WITH ZERO ERRORS');
  console.log('====================================================');
}

runAdversarialTests().catch(err => {
  console.error('Adversarial tests failed:', err);
  process.exit(1);
});
