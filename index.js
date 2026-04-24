const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const USER_ID = "jayaramvardhan_22072005";
const EMAIL_ID = "jn5611@srmist.edu.in";
const COLLEGE_ROLL_NUMBER = "RA2311050010007";

function isValidEntry(entry) {
  if (typeof entry !== 'string') return false;
  entry = entry.trim();
  const pattern = /^[A-Z]->[A-Z]$/;
  return pattern.test(entry);
}

function buildHierarchies(edges) {
  const parentMap = {};
  const childrenMap = {};
  const allNodes = new Set();

  for (const edge of edges) {
    const [parent, child] = edge.split('->');
    allNodes.add(parent);
    allNodes.add(child);
    if (!childrenMap[parent]) childrenMap[parent] = [];
    if (parentMap[child] === undefined) {
      parentMap[child] = parent;
      childrenMap[parent].push(child);
    }
  }

  const roots = [];
  for (const node of allNodes) {
    if (parentMap[node] === undefined) roots.push(node);
  }

  const visited = new Set();
  const hierarchies = [];

  function buildTree(node) {
    const tree = {};
    const children = childrenMap[node] || [];
    for (const child of children) {
      tree[child] = buildTree(child);
    }
    return tree;
  }

  function getDepth(node) {
    const children = childrenMap[node] || [];
    if (children.length === 0) return 1;
    return 1 + Math.max(...children.map(getDepth));
  }

  function hasCycle(node, visiting = new Set()) {
    if (visiting.has(node)) return true;
    visiting.add(node);
    for (const child of (childrenMap[node] || [])) {
      if (hasCycle(child, new Set(visiting))) return true;
    }
    return false;
  }

  function getGroup(node, group = new Set()) {
    if (group.has(node)) return group;
    group.add(node);
    for (const child of (childrenMap[node] || [])) {
      getGroup(child, group);
    }
    return group;
  }

  for (const root of roots.sort()) {
    const group = getGroup(root);
    group.forEach(n => visited.add(n));

    if (hasCycle(root)) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const tree = {};
      tree[root] = buildTree(root);
      const depth = getDepth(root);
      hierarchies.push({ root, tree, depth });
    }
  }

  // Handle pure cycles (no root found)
  for (const node of allNodes) {
    if (!visited.has(node)) {
      const group = getGroup(node);
      group.forEach(n => visited.add(n));
      const root = [...group].sort()[0];
      hierarchies.push({ root, tree: {}, has_cycle: true });
    }
  }

  return hierarchies;
}

app.post('/bfhl', (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'data must be an array' });
  }

  const invalidEntries = [];
  const duplicateEdges = [];
  const validEdges = [];
  const seenEdges = new Set();

  for (const entry of data) {
    const trimmed = typeof entry === 'string' ? entry.trim() : entry;

    if (!isValidEntry(trimmed)) {
      invalidEntries.push(trimmed);
      continue;
    }

    if (seenEdges.has(trimmed)) {
      if (!duplicateEdges.includes(trimmed)) {
        duplicateEdges.push(trimmed);
      }
    } else {
      seenEdges.add(trimmed);
      validEdges.push(trimmed);
    }
  }

  const hierarchies = buildHierarchies(validEdges);

  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largestTreeRoot = '';
  let maxDepth = -1;
  for (const h of nonCyclic) {
    if (h.depth > maxDepth || (h.depth === maxDepth && h.root < largestTreeRoot)) {
      maxDepth = h.depth;
      largestTreeRoot = h.root;
    }
  }

  const response = {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: nonCyclic.length,
      total_cycles: cyclic.length,
      largest_tree_root: largestTreeRoot
    }
  };

  res.json(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});