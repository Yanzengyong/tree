import 'rc-tree/assets/index.less';
import React, {PropTypes} from 'react';
import ReactDOM from 'react-dom';
import Tree, {TreeNode} from 'rc-tree';
import { /* filterParentPosition,*/ getFilterExpandedKeys } from './util';
import Gen from './big-data-generator';

const Demo = React.createClass({
  propTypes: {
    multiple: PropTypes.bool,
  },
  getDefaultProps() {
    return {
    };
  },
  getInitialState() {
    return {
      gData: [],
      expandedKeys: [],
      checkedKeys: [],
      checkedKeys1: [],
      selectedKeys: [],
    };
  },
  componentWillUpdate(nextProps, nextState) {
    // invoked immediately before rendering with new props or state, not for initial 'render'
    // see componentWillReceiveProps if you need to call setState
    // console.log(nextState.gData === this.state.gData);
    if (nextState.gData === this.state.gData) {
      this.notReRender = true;
    } else {
      this.notReRender = false;
    }
  },
  onExpand(treeNode, expand, expandedKeys) {
    console.log('onExpand', expand, expandedKeys);
    const index = expandedKeys.indexOf(treeNode.props.eventKey);
    if (expand) {
      if (index > -1) {
        expandedKeys.splice(index, 1);
      }
    } else {
      if (index === -1) {
        expandedKeys.push(treeNode.props.eventKey);
      }
    }
    this.setState({
      expandedKeys: expandedKeys,
    });
  },
  onCheck(checkedKeys) {
    this.setState({
      checkedKeys,
    });
  },
  onCheckStrictly(checkedKeys1, /* extra*/) {
    console.log(arguments);
    // const { checkedNodesPositions } = extra;
    // const pps = filterParentPosition(checkedNodesPositions.map(i => i.pos));
    // console.log(checkedNodesPositions.filter(i => pps.indexOf(i.pos) > -1).map(i => i.node.key));
    this.setState({
      checkedKeys1,
    });
  },
  onSelect(selectedKeys, info) {
    console.log('onSelect', selectedKeys, info);
    this.setState({
      selectedKeys,
    });
  },
  onGen(data) {
    this.setState({
      gData: data,
      expandedKeys: getFilterExpandedKeys(data, ['0-0-0-key']),
      // checkedKeys: ['0-0-0-0-key', '0-0-1-0-key', '0-1-0-0-key'],
      checkedKeys: ['0-0-0-key'],
      checkedKeys1: ['0-0-0-key'],
      selectedKeys: [],
    });
  },
  render() {
    const loop = data => {
      return data.map((item) => {
        if (item.children) {
          return (<TreeNode key={item.key} title={item.title}>
            {loop(item.children)}
          </TreeNode>);
        }
        return <TreeNode key={item.key} title={item.title}/>;
      });
    };
    // const s = Date.now();
    // const treeNodes = loop(this.state.gData);
    let treeNodes;
    if (this.treeNodes && this.notReRender) {
      treeNodes = this.treeNodes;
    } else {
      treeNodes = loop(this.state.gData);
      this.treeNodes = treeNodes;
    }
    // console.log(Date.now()-s);
    return (<div style={{padding: '0 20px'}}>
      <Gen onGen={this.onGen} />
      <div style={{ border: '1px solid red', width: 700, padding: 10}}>
        <h5 style={{ margin: 10 }}>大数据量下优化建议：</h5>
        初始展开的节点少，向dom中插入节点就会少，速度更快。 <br />
        treeNodes 总数据量尽量少变化，缓存并复用计算出的 treeNodes，可在 componentWillUpdate 等时机做判断。 <br />
      </div>
      {this.state.gData.length ? <div style={{ display: 'flex' }}>
        <div style={{ marginRight: 20 }}>
          <h3>normal check</h3>
          <Tree checkable multiple={this.props.multiple}
                onExpand={this.onExpand} expandedKeys={this.state.expandedKeys}
                onCheck={this.onCheck} checkedKeys={this.state.checkedKeys}
                onSelect={this.onSelect} selectedKeys={this.state.selectedKeys}>
            {treeNodes}
          </Tree>
        </div>
        <div>
          <h3>checkStrictly</h3>
          <Tree checkable checkStrictly multiple={this.props.multiple}
                onExpand={this.onExpand} expandedKeys={this.state.expandedKeys}
                onCheck={this.onCheckStrictly} checkedKeys={this.state.checkedKeys1}
                onSelect={this.onSelect} selectedKeys={this.state.selectedKeys}>
            {treeNodes}
          </Tree>
        </div>
      </div> : null}
    </div>);
  },
});

ReactDOM.render(<Demo />, document.getElementById('__react-content'));