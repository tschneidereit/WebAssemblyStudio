import * as React from "react";
import { MouseEvent } from "react";
import { EventDispatcher } from "../model";
import { assert } from "../index";

var Cassowary = require("cassowary");

// Cassowary.trace = true;

interface CassowaryVar {
  value: number;
}

function arrayEqual(a: any[], b: any[]) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] != b[i]) {
      return false;
    }
  }
  return true;
}

function toCSSPercent(x: number) {
  return x + "%";
}

function toCSSPx(x: number) {
  return (x | 0) + "px";
}

function isCSSPercentage(x: string) {
  return x[x.length - 1] === "%";
}

function parseCSSPercentage(x: string) {
  return Number(x.substring(0, x.length - 1)) / 100;
}

function clone(array: any[]): any[] {
  return array.slice(0);
}

function sum(array: number[], n?: number) {
  let x = 0;
  if (n === undefined) {
    n = array.length;
  }
  for (let i = 0; i < n; i++) {
    x += array[i];
  }
  return x;
}

function assignObject(to: any, from: any) {
  for (var x in from) {
    if (!(x in to)) {
      to[x] = from[x];
    }
  }
  return to;
}

export enum SplitOrientation {
  Horizontal,
  Vertical
}

export interface SplitInfo {
  min?: number;
  max?: number;
  value?: number;
  resize?: "fixed" | "stretch";
}

function splitInfoEquals(a: SplitInfo, b: SplitInfo) {
  return a.min === b.min && a.max === b.max && a.value === b.value && a.resize === b.resize;
}

function splitInfoArrayEquals(a: SplitInfo[], b: SplitInfo[]) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!splitInfoEquals(a[i], b[i])) {
      return false;
    }
  }
  return true;
}

export interface SplitProps {
  orientation: SplitOrientation
  onChange?: (splits: SplitInfo[]) => void;
  splits?: SplitInfo[];
  defaultSplit?: SplitInfo;
  children: React.ReactNode;
  name?: string; // TODO: Remove, for deubgging.
}

export class Split extends React.Component<SplitProps, {
  splits: SplitInfo[];
}> {
  refs: {
    container: HTMLDivElement;
  }
  static onGlobalResize = new EventDispatcher("Split Resize");
  static onResizeBegin = new EventDispatcher("Resize Begin");
  static onResizeEnd = new EventDispatcher("Resize End");
  constructor(props: any) {
    super(props);
    this.state = {
      splits: []
    }
  }

  index: number = -1;
  onResizerMouseDown(i: number) {
    this.index = i;
    this.solver.addEditVar(this.vars[this.index + 1], Cassowary.Strength.strong).beginEdit();
    Split.onResizeBegin.dispatch(this);
    window.document.documentElement.style.pointerEvents = "none";
  }

  /**
   * This fires for all splits, even if the resizer doesn't belong to this split.
   */
  onResizerMouseUp = (e: Event) => {
    if (this.index < 0) {
      return;
    }
    this.index = -1;
    Split.onResizeEnd.dispatch(this);
    this.solver.endEdit();
    window.document.documentElement.style.pointerEvents = "auto";
    this.querySolver(this.state.splits);
    this.props.onChange && this.props.onChange(this.state.splits);
  }

  onResizerMouseMove = (e: MouseEvent<any>) => {
    if (this.index < 0) {
      return;
    }
    let vars = this.vars;
    let isVertical = this.props.orientation === SplitOrientation.Vertical;
    let container = this.refs.container;
    let rect = container.getBoundingClientRect();
    let mouseOffset = isVertical ? e.clientX - rect.left : e.clientY - rect.top;
    this.solver.suggestValue(vars[this.index + 1], mouseOffset);
    this.solver.resolve();
    let splits = this.state.splits;
    this.querySolver(splits);
    this.setState({ splits });
    e.preventDefault();
  }

  querySolver(splits: SplitInfo[]) {
    let vars = this.vars;
    for (let i = 0; i < splits.length; i++) {
      splits[i].value = vars[i + 1].value - vars[i].value;
    }
    // console.log(vars.map(v => v.value));
  }

  componentWillReceiveProps(nextProps: SplitProps) {
    // if (this.props.name === "Editors") {
    //   console.info("X: " );
    // }
    // console.info(this.props.name + ": " + this.getContainerSize(nextProps.orientation));
    // console.log("componentWillReceiveProps");
    let splits = this.canonicalizeSplits(nextProps);
    this.setupSolver(splits, this.getContainerSize(nextProps.orientation));
    this.querySolver(splits);
    this.setState({ splits });
  }

  private getContainerSize(orientation: SplitOrientation): number {
    return orientation === SplitOrientation.Horizontal ? this.refs.container.clientHeight : this.refs.container.clientWidth;
  }

  private canonicalizeSplits(props: SplitProps): SplitInfo[] {
    let count = React.Children.count(props.children);
    let containerSize = this.getContainerSize(props.orientation);
    let splits = []
    for (let i = 0; i < count; i++) {
      let info = {};
      if (props.splits && i < props.splits.length) {
        assignObject(info, props.splits[i]);
      }
      if (props.defaultSplit) {
        assignObject(info, props.defaultSplit);
      }
      splits.push(assignObject(info, {
        min: 32,
        max: containerSize,
      }) as SplitInfo);
    }
    return splits;
  }

  private solver: any;
  private vars: CassowaryVar[];

  /**
   * Initializes a Cassowary solver and the constraints based on split infos and container size.
   */
  private setupSolver(splits: SplitInfo[], containerSize: number) {
    assert(this.index < 0, "Should not be in a dragging state.");
    const weak = Cassowary.Strength.weak;
    const medium = Cassowary.Strength.medium;
    const strong = Cassowary.Strength.strong;
    const required = Cassowary.Strength.required;

    function eq(a1: any, a2: any, strength: number, weight?: number) {
      return new Cassowary.Equation(a1, a2, strength || weak, weight || 0);
    };

    function geq(a1: any, a2: any, strength: any, weight?: number) {
      return new Cassowary.Inequality(a1, Cassowary.GEQ, a2, strength, weight);
    };

    function leq(a1: any, a2: any, strength: any, weight?: number) {
      return new Cassowary.Inequality(a1, Cassowary.LEQ, a2, strength, weight);
    };

    // f     1               2           3   ...    l
    // |-----|---------------|-----------|----------|

    let vars: CassowaryVar[] = this.vars = [new Cassowary.Variable()];
    var solver = this.solver = new Cassowary.SimplexSolver();

    // Create Cassowary variables, these the dragged position as an offset from the origin.
    for (let i = 0; i < splits.length; i++) {
      vars.push(new Cassowary.Variable());
    }
    vars[0].value = 0;
    vars[vars.length - 1].value = containerSize;
    solver.addStay(vars[0], required);
    solver.addStay(vars[vars.length - 1], required);

    let offset = 0;
    for (let i = 0; i < vars.length - 1; i++) {
      let { min, max } = splits[i];
      const l = vars[i];
      const r = vars[i + 1];
      solver.addConstraint(geq(Cassowary.minus(r, l), min, strong)); // (y - x) >= min
      solver.addConstraint(leq(Cassowary.minus(r, l), max, strong)); // (y - x) <= max
    }

    // Add stays for the variables representing the dragged panes. This causes them to
    // try and remain in their dragged position unless the constraints prevent that.
    for (let i = 1; i < vars.length - 1; i++) {
      solver.addStay(vars[i], weak);
    }

    this.suggestVarValues(splits);
  }

  suggestVarValues(splits: SplitInfo[]) {
    const vars = this.vars;
    for (let i = 0; i < vars.length - 1; i++) {
      let x = vars[i];
      let y = vars[i + 1];
      if (splits[i].value) {
        if (i < vars.length - 2) {
          this.solver.addEditVar(y, Cassowary.Strength.strong).beginEdit();
          this.solver.suggestValue(y, x.value + (splits[i].value as number));
        } else {
          this.solver.addEditVar(x, Cassowary.Strength.strong).beginEdit();
          this.solver.suggestValue(x, y.value - (splits[i].value as number));
        }
        this.solver.endEdit();
        this.solver.resolve();
      }
    }
  }

  // onGlobalResize = (target: any) => {
  //   if (this === target) {
  //     return;
  //   }
  //   // this.resizePanes();
  //   // this.props.onChange && this.props.onChange();
  // }
  componentDidMount() {
    // console.log("componentDidMount");
    // Split.onGlobalResize.register(this.onGlobalResize);
    document.addEventListener("mousemove", this.onResizerMouseMove as any);
    document.addEventListener("mouseup", this.onResizerMouseUp);
    let splits = this.canonicalizeSplits(this.props);
    this.setupSolver(splits, this.getContainerSize(this.props.orientation));
    this.querySolver(splits);
    this.setState({ splits });
  }
  componentWillUnmount() {
    // Split.onGlobalResize.unregister(this.onGlobalResize);
    document.removeEventListener("mousemove", this.onResizerMouseMove as any);
    document.removeEventListener("mouseup", this.onResizerMouseUp);
  }

  render() {
    let { splits } = this.state;
    // let layout = [];
    // let layout = [splits[0].value];
    // for (let i = 1; i < this.vars.length; i++) {
    //   layout.push(vars[i].value - vars[i - 1].value);
    // }
    let resizerClassName = "resizer";
    let isHorizontal = this.props.orientation === SplitOrientation.Horizontal;
    if (isHorizontal) {
      resizerClassName += " horizontal";
    } else {
      resizerClassName += " vertical";
    }
    // console.log("Splits", splits, sum(splits), this.state.size);
    let count = React.Children.count(this.props.children);
    let children: any[] = [];
    React.Children.forEach(this.props.children, (child, i) => {
      let style: any = {};
      if (i < count - 1 && i < splits.length) {
        style.flexBasis = toCSSPx(Math.round(splits[i].value as number));
      } else {
        style.flex = 1;
      }
      children.push(<div key={i} className="split-pane" style={style}>{child}</div>);
      if (i < count - 1) {
        children.push(<div key={"split:" + i} className={resizerClassName} onMouseDown={this.onResizerMouseDown.bind(this, i)}>
        </div>);
      }
    });
    return <div className="split" ref="container" style={{ flexDirection: isHorizontal ? "column" : "row" }}>
      {children}
    </div>;
  }
}