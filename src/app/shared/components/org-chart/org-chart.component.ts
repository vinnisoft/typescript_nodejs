import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { getFlagHtml } from '../../utils/misc';

@Component({
  selector: 'app-org-chart',
  templateUrl: './org-chart.component.html',
  styleUrls: ['./org-chart.component.scss'],
})
export class OrgChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  @Input() data: any = {};

  private svg: any;
  private zoomLevel = 0.8; // Adjust from 1 to 0.8 for better initial view
  private offsetX = -150;
  private offsetY = 0;
  private isPanning = false;
  private startX: number = 0;
  private startY: number = 0;

  constructor(private router: Router) {}

  ngOnInit() {
    this.setupChartInteractions();
    this.renderChart();
  }

  setupChartInteractions() {
    const container = this.chartContainer.nativeElement;

    container.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.zoomLevel += e.deltaY * -0.001;
      this.zoomLevel = Math.min(Math.max(this.zoomLevel, 0.1), 3);
      this.updateView();
    });

    container.addEventListener('mousedown', (e: MouseEvent) => {
      this.isPanning = true;
      this.startX = e.clientX - this.offsetX;
      this.startY = e.clientY - this.offsetY;
    });

    container.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    container.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isPanning) return;
      this.offsetX = e.clientX - this.startX;
      this.offsetY = e.clientY - this.startY;
      this.updateView();
    });
  }

  updateView() {
    if (!this.svg) return;

    const container = this.chartContainer.nativeElement;
    this.svg.setAttribute(
      'viewBox',
      `${-this.offsetX / this.zoomLevel} ${-this.offsetY / this.zoomLevel} ${
        container.clientWidth / this.zoomLevel
      } ${container.clientHeight / this.zoomLevel}`
    );
  }

  renderChart() {
    // Clear any existing chart
    if (this.chartContainer.nativeElement.firstChild) {
      this.chartContainer.nativeElement.innerHTML = '';
    }
    if (!this.data) {
      console.error('Invalid data format for org chart');
      return;
    }

    // Create SVG element
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('id', 'orgChart');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');

    // Add arrow marker definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'marker'
    );
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');

    const polygon = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon'
    );
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#898989');

    marker.appendChild(polygon);
    defs.appendChild(marker);
    this.svg.appendChild(defs);

    this.chartContainer.nativeElement.appendChild(this.svg);

    // Transform the data to the format expected by the chart
    const elements = this.transformData(this.data);

    const rootNodes = this.buildTree(elements);

    if (rootNodes.length === 0) return;

    const nodeWidth = 150;
    const nodeHeight = 40;
    const verticalSpacing = 30;
    const childVerticalSpacing = 30;
    const childIndent = 25;
    const horizontalSpacing = 300;
    const startY = 450;

    const root = rootNodes[0];
    const secondLevel = root.children;
    const totalWidth = (secondLevel.length - 1) * horizontalSpacing;
    const startX = 600 - totalWidth / 2;

    const firstChildX = startX + nodeWidth / 2;
    const lastChildX =
      startX + (secondLevel.length - 1) * horizontalSpacing + nodeWidth / 2;
    const centerX = (firstChildX + lastChildX) / 2;

    this.drawRoot(
      root,
      centerX,
      startY,
      nodeWidth,
      nodeHeight,
      verticalSpacing,
      horizontalSpacing,
      childVerticalSpacing,
      childIndent
    );

    // Auto-center the view on the top entity
    const container = this.chartContainer.nativeElement;
    const centerOffsetX = centerX - container.clientWidth / 2 + nodeWidth / 2;
    const centerOffsetY = startY - container.clientHeight / 2 + nodeHeight / 2;
    this.offsetX = -centerOffsetX;
    this.offsetY = -centerOffsetY; // Add vertical centering
    this.updateView();
  }

  transformData(data: any) {
    const elements: any[] = [];

    // Check if data is an array (as in the provided JSON)
    if (Array.isArray(data)) {
      // Find the main company (top level)
      const mainCompany = data.find(
        (company) =>
          company.companyType === 'main' || company.parentCompany === null
      );

      if (mainCompany) {
        // Add main company as root
        elements.push({
          name: mainCompany.companyName,
          id: mainCompany._id,
          parent: null,
          type: mainCompany.companyType || 'main',
          flag: mainCompany.registeredAddressCountry
            ? getFlagHtml(mainCompany.registeredAddressCountry.countryCode)
            : null,
        });

        // Find all parent companies (second level)
        const parentCompanies = data[0].children.filter(
          (company) =>
            company.companyType === 'parent' &&
            company.parentCompany === mainCompany._id
        );

        // Add each parent company
        parentCompanies.forEach((parent) => {
          elements.push({
            name: parent.companyName,
            id: parent._id,
            parent: mainCompany._id,
            type: parent.companyType,
            flag: parent.registeredAddressCountry
              ? getFlagHtml(parent.registeredAddressCountry.countryCode)
              : null,
          });

          // Find subsidiary companies for this parent (third level)
          const subsidiaries = parent.children.filter(
            (company) =>
              company.companyType === 'subsidiary' &&
              company.parentCompany === parent._id
          );
          // Add each subsidiary
          subsidiaries.forEach((subsidiary) => {
            elements.push({
              name: subsidiary.companyName,
              id: subsidiary._id,
              parent: parent._id,
              type: subsidiary.companyType,
              flag: subsidiary.registeredAddressCountry
                ? getFlagHtml(subsidiary.registeredAddressCountry.countryCode)
                : null,
            });
          });
        });

        // Handle subsidiaries directly under main company
        // const directSubsidiaries = data[0].children.filter(
        //   (company) =>
        //     company.companyType === 'subsidiary' &&
        //     company.parentCompany === mainCompany._id
        // );

        // directSubsidiaries.forEach((subsidiary) => {
        //   elements.push({
        //     name: subsidiary.companyName,
        //     id: subsidiary._id,
        //     parent: mainCompany._id,
        //     type: subsidiary.companyType,
        //     flag: subsidiary.registeredAddressCountry
        //       ? getFlagHtml(subsidiary.registeredAddressCountry.countryCode)
        //       : null,
        //     // url: '#',
        //   });
        // });

        // // Handle companies with shareholdings but no parent
        // const companiesWithShareholdings = data.filter(
        //   (company) =>
        //     company.companyType === 'subsidiary' &&
        //     !company.parentCompany &&
        //     company.shareholdings &&
        //     company.shareholdings.length > 0
        // );

        // companiesWithShareholdings.forEach((company) => {
        //   // Add the company as a direct child of main company
        //   elements.push({
        //     name: company.companyName,
        //     id: company._id,
        //     parent: mainCompany._id, // Connect to main company
        //     type: company.companyType,
        //     flag: company.registeredAddressCountry
        //       ? getFlagHtml(company.registeredAddressCountry.countryCode)
        //       : null,
        //     shareholdings: company.shareholdings, // Pass shareholdings data
        //     // url: '#',
        //   });
        // });
      }
    } else if (data.elements) {
      return data.elements;
    }

    return elements;
  }

  buildTree(data: any[]) {
    const nodes: any = {};
    // Create nodes indexed by id if available, otherwise by name
    data.forEach((d) => {
      const key = d.id || d.name;
      nodes[key] = { ...d, children: [] };
    });

    const rootNodes: any[] = [];
    data.forEach((d) => {
      if (d.parent) {
        if (nodes[d.parent]) {
          nodes[d.parent].children.push(nodes[d.id || d.name]);
        }
      } else {
        rootNodes.push(nodes[d.id || d.name]);
      }
    });

    return rootNodes;
  }

  drawRoot(
    root: any,
    centerX: number,
    centerY: number,
    nodeWidth: number,
    nodeHeight: number,
    verticalSpacing: number,
    horizontalSpacing: number,
    childVerticalSpacing: number,
    childIndent: number
  ) {
    const secondLevel = root.children;
    
    // Draw the root box first
    this.drawBox(
      root.name,
      root.url,
      centerX - nodeWidth / 2,
      centerY,
      nodeWidth,
      nodeHeight,
      root.type,
      root.flag,
      root.id
    );

    // Only proceed with drawing connections if there are children
    if (secondLevel && secondLevel.length > 0) {
      const totalWidth = (secondLevel.length - 1) * horizontalSpacing;
      const startX = centerX - totalWidth / 2;

      const rootBottomY = centerY + nodeHeight;
      const irrigationY = rootBottomY + 30;

      const dropLine = this.createLine(
        centerX,
        rootBottomY,
        centerX,
        irrigationY
      );
      this.svg.appendChild(dropLine);

      const irrigationStartX = startX + nodeWidth / 2;
      const irrigationEndX =
        startX + (secondLevel.length - 1) * horizontalSpacing + nodeWidth / 2;
      const horizontalLine = this.createLine(
        irrigationStartX,
        irrigationY,
        irrigationEndX,
        irrigationY
      );
      this.svg.appendChild(horizontalLine);

      secondLevel.forEach((child: any, index: number) => {
        const childCenterX = startX + index * horizontalSpacing + nodeWidth / 2;
        const childTopY = irrigationY + verticalSpacing;

        const branchLine = this.createLine(
          childCenterX,
          irrigationY,
          childCenterX,
          childTopY
        );
        this.svg.appendChild(branchLine);

        this.drawSubtree(
          child,
          childCenterX - nodeWidth / 2,
          childTopY,
          nodeWidth,
          nodeHeight,
          childVerticalSpacing,
          childIndent
        );
      });
    }
  }

  drawSubtree(
    node: any,
    leftX: number,
    topY: number,
    nodeWidth: number,
    nodeHeight: number,
    childVerticalSpacing: number,
    childIndent: number
  ) {
    this.drawBox(
      node.name,
      node.url,
      leftX,
      topY,
      nodeWidth,
      nodeHeight,
      node.type,
      node.flag,
      node.id,
      node.shareholdings
    );

    // Only proceed with drawing edges if there are actual children
    if (node.children && node.children.length > 0) {
      const centerX = leftX + nodeWidth / 2;
      let nextY = topY + nodeHeight + 30;

      const trunkStartY = topY + nodeHeight;
      const trunkEndY =
        nextY +
        (node.children.length - 1) * (nodeHeight + childVerticalSpacing) +
        nodeHeight / 2;

      const trunkLine = this.createLine(
        centerX,
        trunkStartY,
        centerX,
        trunkEndY
      );
      this.svg.appendChild(trunkLine);

      node.children.forEach((child: any, idx: number) => {
        const childY = nextY + idx * (nodeHeight + childVerticalSpacing);
        const childX = centerX + childIndent;

        const hLine = this.createLine(
          centerX,
          childY + nodeHeight / 2,
          childX,
          childY + nodeHeight / 2
        );
        this.svg.appendChild(hLine);

        this.drawSubtree(
          child,
          childX,
          childY,
          nodeWidth,
          nodeHeight,
          childVerticalSpacing,
          childIndent
        );
      });
    }
  }

  drawBox(
    name: string,
    url: string,
    leftX: number,
    topY: number,
    width: number,
    height: number,
    companyType?: string,
    flag?: string,
    id?: string, // Add id parameter to identify the company
    shareholdings?: any[] // Add shareholdings parameter
  ) {
    // Increase width if flag is present to accommodate it
    if (flag) {
      width += 30; // Add extra width for the flag
    }

    // Add extra width if company icon is present
    if (companyType) {
      width += 20; // Add extra width for the icon
    }

    // Add extra width and height if shareholdings are present
    if (shareholdings && shareholdings.length > 0) {
      width += 40; // Add extra width for shareholding info
      height += 20 * shareholdings.length; // Increase height for each shareholding entry
    }

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');

    // Add cursor style to indicate clickable element
    link.setAttribute('cursor', 'pointer');

    // Add click event listener for navigation
    if (id) {
      link.addEventListener('click', () => {
        this.router.navigate(['companies/view/', id]);
      });
    }

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', leftX.toString());
    rect.setAttribute('y', topY.toString());
    rect.setAttribute('width', width.toString());
    rect.setAttribute('height', height.toString());
    rect.setAttribute('rx', '4'); // Smaller rounded corners
    rect.setAttribute('fill', '#ffffff'); // Explicitly set fill color

    // Add hover effect
    rect.setAttribute('stroke', '#e0e0e0');
    rect.setAttribute('stroke-width', '1');

    // Handle text with truncation if too long
    const maxLength = 20; // Maximum characters to display
    let displayText = name;
    if (name.length > maxLength) {
      displayText = name.substring(0, maxLength - 3) + '...';
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    // First add the rectangle (background)
    link.appendChild(rect);

    // Add company icon based on company type
    if (companyType) {
      const iconUrl =
        companyType === 'main'
          ? '/assets/icons/top-level-company.png'
          : '/assets/icons/child-company.png';

      // Create a foreignObject to embed HTML content
      const foreignObject = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'foreignObject'
      );
      foreignObject.setAttribute('x', (leftX + 10).toString()); // Add margin from left edge
      foreignObject.setAttribute('y', (topY + (height - 20) / 2).toString());
      foreignObject.setAttribute('width', '20');
      foreignObject.setAttribute('height', '20');

      // Create an HTML img element
      const img = document.createElement('img');
      img.src = iconUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';

      foreignObject.appendChild(img);
      link.appendChild(foreignObject);
    }

    // Calculate text position with proper spacing
    let textX = leftX + width / 2;
    let textY = topY + height / 2 + 4;

    // Adjust text position if shareholdings are present
    if (shareholdings && shareholdings.length > 0) {
      textY = topY + 20; // Position text at the top
    }

    // Set text position and attributes
    text.setAttribute('x', textX.toString());
    text.setAttribute('y', textY.toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#000000');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-size', '12px');
    text.textContent = displayText;

    // Add the text
    link.appendChild(text);

    // Add flag if available
    if (flag) {
      // Create a foreignObject to embed HTML content
      const foreignObject = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'foreignObject'
      );
      foreignObject.setAttribute('x', (leftX + width - 35).toString()); // Position with more space from the right edge
      foreignObject.setAttribute('y', (topY + (height - 15) / 2).toString());
      foreignObject.setAttribute('width', '25'); // Slightly wider to accommodate flag
      foreignObject.setAttribute('height', '15');

      // Create a div to hold the HTML content
      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.height = '100%';
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'center';
      div.innerHTML = flag;

      foreignObject.appendChild(div);
      link.appendChild(foreignObject);
    }

    // Add shareholding information if available
    if (shareholdings && shareholdings.length > 0) {
      // Add a divider line
      const divider = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      );
      divider.setAttribute('x1', leftX.toString());
      divider.setAttribute('y1', (topY + 30).toString());
      divider.setAttribute('x2', (leftX + width).toString());
      divider.setAttribute('y2', (topY + 30).toString());
      divider.setAttribute('stroke', '#e0e0e0');
      divider.setAttribute('stroke-width', '1');
      link.appendChild(divider);

      // Add shareholding text
      const shareholdingTitle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );
      shareholdingTitle.setAttribute('x', (leftX + 10).toString());
      shareholdingTitle.setAttribute('y', (topY + 45).toString());
      shareholdingTitle.setAttribute('fill', '#666666');
      shareholdingTitle.setAttribute('font-size', '10px');
      shareholdingTitle.textContent = 'Shareholdings:';
      link.appendChild(shareholdingTitle);

      // Add each shareholding entry
      shareholdings.forEach((holding, index) => {
        const yPos = topY + 60 + index * 15;

        // Create text for company percentage
        const percentageText = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text'
        );
        percentageText.setAttribute('x', (leftX + 15).toString());
        percentageText.setAttribute('y', yPos.toString());
        percentageText.setAttribute('fill', '#333333');
        percentageText.setAttribute('font-size', '10px');
        percentageText.textContent = `${holding.percentage}%`;
        link.appendChild(percentageText);

        // Create text for company ID (ideally we would show company name)
        const companyText = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'text'
        );
        companyText.setAttribute('x', (leftX + 50).toString());
        companyText.setAttribute('y', yPos.toString());
        companyText.setAttribute('fill', '#333333');
        companyText.setAttribute('font-size', '10px');
        // Truncate company ID for display
        const companyId = holding.company.substring(0, 8) + '...';
        companyText.textContent = companyId;
        link.appendChild(companyText);
      });
    }

    group.appendChild(link);
    this.svg.appendChild(group);
  }

  createLine(x1: number, y1: number, x2: number, y2: number) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', '#898989');
    line.setAttribute('stroke-width', '1'); // Making lines thinner
    return line;
  }

  ngOnDestroy() {
    // Clean up event listeners if needed
    const container = this.chartContainer.nativeElement;
    container.removeEventListener('wheel', null);
    container.removeEventListener('mousedown', null);
    container.removeEventListener('mouseup', null);
    container.removeEventListener('mousemove', null);
  }
}
