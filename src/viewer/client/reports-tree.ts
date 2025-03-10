import * as d3 from 'd3';
import { UUID } from 'mongodb';

const width = 1200;
const height = 800;
const margin = {top: 20, right: 90, bottom: 30, left: 90};

const tree = d3.tree<Report>()
    .nodeSize([6, 16])
    .separation((a, b) => a.parent === b.parent ? 1.5 : 4);

interface Report {
    runId: string;
    parentSolutionId: string;
    solutionId: string;
}

function update(svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>, source: d3.HierarchyNode<Report>): void {
    const treeLayout = tree(source);

    const links = svg.selectAll<SVGPathElement, d3.HierarchyLink<Report>>(".link")
        .data(treeLayout.links(), d => d.target.data.solutionId);

    links.enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal<d3.HierarchyLink<Report>, d3.HierarchyNode<Report>>()
            .x(d => d.y ?? 0)
            .y(d => d.x ?? 0));

    links.exit().remove();

    const nodes = svg.selectAll<SVGGElement, d3.HierarchyNode<Report>>(".node")
        .data(treeLayout.descendants(), d => d.data.solutionId);

    const nodeEnter = nodes.enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.y},${d.x})`);

    nodeEnter.append("circle")
        .attr("r", 3)

    nodes.exit().remove();
}

export function initializeTree(reports: Report[]): void {
    const rootReport = reports.find(report => report.parentSolutionId === null);
    if (!rootReport) {
        console.error("No root report found");
        return;
    }

    const svg = d3.select("#tree-container")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

 

    const root = d3.hierarchy<Report>(rootReport, r => reports.filter(report => report.parentSolutionId === r.solutionId));

    update(svg, root);
} 