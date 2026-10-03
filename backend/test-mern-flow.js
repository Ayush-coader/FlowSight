const { buildRepositoryGraph } = require('./src/services/graphService');

async function testMernAuthFlow() {
  console.log('=== TESTING FLOWSIGHT MERN AUTHENTICATION FLOW ===');

  const files = [
    // 1. React Frontend Login Page
    {
      relativePath: 'frontend/src/pages/LoginPage.jsx',
      content: `
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      if (response.data.token) {
        navigate('/home');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <input value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Submit</button>
      </form>
      <Link to="/register">Register</Link>
    </div>
  );
}
      `,
      extension: '.jsx',
      size: 600
    },

    // 2. Express Server Entry Point
    {
      relativePath: 'backend/src/server.js',
      content: `
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);

app.listen(5000);
      `,
      extension: '.js',
      size: 200
    },

    // 3. Express Auth Routes
    {
      relativePath: 'backend/src/routes/authRoutes.js',
      content: `
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

router.post('/login', login);

module.exports = router;
      `,
      extension: '.js',
      size: 200
    },

    // 4. Auth Controller
    {
      relativePath: 'backend/src/controllers/authController.js',
      content: `
const { loginUser } = require('../services/authService');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    return res.json({ token: result.token, user: result.user });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
}

module.exports = { login };
      `,
      extension: '.js',
      size: 350
    },

    // 5. Auth Service & Mongoose queries
    {
      relativePath: 'backend/src/services/authService.js',
      content: `
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function loginUser(email, password) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
  return { token, user };
}

module.exports = { loginUser };
      `,
      extension: '.js',
      size: 550
    },

    // 6. User Model
    {
      relativePath: 'backend/src/models/User.js',
      content: `
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true }
});

module.exports = mongoose.model('User', userSchema);
      `,
      extension: '.js',
      size: 250
    }
  ];

  console.log('\n--- AST ANALYZED FILES ---');
  files.forEach(f => {
    const res = require('./src/analyzers/universalAnalyzer').analyzeSourceFile(f);
    console.log(f.relativePath, { routes: res.routes, calls: res.calls?.map(c => c.calleeName), dbOps: res.dbOperations });
  });

  const graph = buildRepositoryGraph(files, 'MERN-Auth-App');

  console.log('\n--- APPLICATION FLOW (L1) NODES ---');
  graph.applicationFlow.nodes.forEach((n, idx) => {
    console.log(`${idx + 1}. [${n.type}] ${n.semanticName}`);
    console.log(`   Inputs: [${n.inputs.join(', ')}] | Outputs: [${n.outputs.join(', ')}]`);
    console.log(`   Source: ${n.file}:${n.line} | Technical: ${n.technicalName}`);
    console.log(`   Confidence: ${n.confidence.level} (${Math.round(n.confidence.score * 100)}%)`);
  });

  console.log('\n--- APPLICATION DATA FLOW EDGES ---');
  graph.applicationFlow.edges.forEach((e, idx) => {
    const srcNode = graph.applicationFlow.nodes.find((n) => n.id === e.source);
    const tgtNode = graph.applicationFlow.nodes.find((n) => n.id === e.target);
    console.log(`${idx + 1}. ${srcNode?.semanticName} --[ ${e.label} ]--> ${tgtNode?.semanticName}`);
    if (e.dataItems?.length > 0) {
      console.log(`   Data items: ${JSON.stringify(e.dataItems.map(d => d.name))}`);
    }
  });

  console.log('\nTotal Application Flow Nodes:', graph.applicationFlow.nodes.length);
  console.log('Total Application Flow Edges:', graph.applicationFlow.edges.length);
  console.log('Total Technical Nodes (L2/L3/L4):', graph.nodes.length - graph.applicationFlow.nodes.length);
}

testMernAuthFlow().catch(console.error);
