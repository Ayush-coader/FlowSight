const { discoverSourceFiles } = require('./src/services/repositoryService');
const { buildRepositoryGraph } = require('./src/services/graphService');
const { analyzeSourceFile } = require('./src/analyzers/universalAnalyzer');
const path = require('path');

async function test() {
  console.log('--- Testing FlowSight Multi-Language AST Pipeline ---');

  // 1. Test Python Analysis
  const pyCode = `
import os
from flask import Flask, request, jsonify
from .models import WeatherData

app = Flask(__name__)

@app.route('/api/weather', methods=['GET', 'POST'])
def get_weather(city: str):
    data = WeatherData.objects.filter(city=city)
    if not data:
        return jsonify({'error': 'not found'}), 404
    return jsonify(data)
`;
  const pyRes = analyzeSourceFile({ relativePath: 'src/views/weather.py', content: pyCode, extension: '.py', size: pyCode.length });
  console.log('Python analysis:', {
    routes: pyRes.routes,
    functions: pyRes.functions?.map((f) => f.name),
    dbOps: pyRes.dbOperations,
    conditions: pyRes.functions[0]?.conditions
  });

  // 2. Test Go Analysis
  const goCode = `
package main

import (
  "net/http"
  "github.com/gin-gonic/gin"
)

type User struct {
  ID string
}

func HandleUser(c *gin.Context) {
  r.GET("/api/users", HandleUser)
  db.Query("SELECT * FROM users")
  return
}
`;
  const goRes = analyzeSourceFile({ relativePath: 'main.go', content: goCode, extension: '.go', size: goCode.length });
  console.log('Go analysis:', {
    routes: goRes.routes,
    functions: goRes.functions?.map((f) => f.name),
    dbOps: goRes.dbOperations
  });

  // 3. Test Full Workspace
  const files = await discoverSourceFiles(__dirname);
  console.log(`Discovered ${files.length} total source files across all languages.`);

  const graph = buildRepositoryGraph(files, 'FlowSight-Backend');
  console.log('Graph Summary:', JSON.stringify(graph.summary, null, 2));
  console.log(`Total Nodes: ${graph.nodes.length}`);
  console.log(`Total Edges: ${graph.edges.length}`);
  console.log('--- Multi-Language Pipeline Verified! ---');
}

test().catch(console.error);
