import * as React from 'react';
import classNames from 'classnames';
// @ts-ignore
import { TreeContext, TreeContextProps } from './contextTypes';
import { getDataAndAria } from './util';
import { IconType, Key, DataNode } from './interface';
import Indent from './Indent';
import { convertNodePropsToEventData } from './utils/treeUtil';

const ICON_OPEN = 'open';
const ICON_CLOSE = 'close';

const defaultTitle = '---';

export interface TreeNodeProps {
  eventKey?: Key; // Pass by parent `cloneElement`
  prefixCls?: string;
  className?: string;
  style?: React.CSSProperties;

  // By parent
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean;
  loaded?: boolean;
  loading?: boolean;
  halfChecked?: boolean;
  title?: React.ReactNode | ((data: DataNode) => React.ReactNode);
  dragOver?: boolean;
  dragOverGapTop?: boolean;
  dragOverGapBottom?: boolean;
  pos?: string;
  domRef?: React.Ref<HTMLDivElement>;
  /** New added in Tree for easy data access */
  data?: DataNode;
  isStart?: boolean[];
  isEnd?: boolean[];
  active?: boolean;
  onMouseMove?: React.MouseEventHandler<HTMLDivElement>;

  // By user
  isLeaf?: boolean;
  checkable?: boolean;
  selectable?: boolean;
  disabled?: boolean;
  disableCheckbox?: boolean;
  icon?: IconType;
  switcherIcon?: IconType;
  children?: React.ReactNode;
}

export interface InternalTreeNodeProps extends TreeNodeProps {
  context?: TreeContextProps;
}

export interface TreeNodeState {
  dragNodeHighlight: boolean;
}

class InternalTreeNode extends React.Component<InternalTreeNodeProps, TreeNodeState> {
  public state = {
    dragNodeHighlight: false,
  };

  public selectHandle: HTMLSpanElement;

  // Isomorphic needn't load data in server side
  componentDidMount() {
    this.syncLoadData(this.props);
    this.props.context.nodeInstances.set(this.props.eventKey, this)
  }

  componentDidUpdate(prevProps) {
    this.syncLoadData(this.props);
    if (prevProps.eventKey !== this.props.eventKey) {
      this.props.context.nodeInstances.delete(prevProps.eventKey)
      this.props.context.nodeInstances.set(this.props.eventKey, this)
    }
  }

  componentWillUnmount() {
    this.props.context.nodeInstances.delete(this.props.eventKey)
  }

  onSelectorClick = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    // Click trigger before select/check operation
    const {
      context: { onNodeClick },
    } = this.props;
    onNodeClick(e, convertNodePropsToEventData(this.props));

    if (this.isSelectable()) {
      this.onSelect(e);
    } else {
      this.onCheck(e);
    }
  };

  onSelectorDoubleClick = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    const {
      context: { onNodeDoubleClick },
    } = this.props;
    onNodeDoubleClick(e, convertNodePropsToEventData(this.props));
  };

  onSelect = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    if (this.isDisabled()) return;

    const {
      context: { onNodeSelect },
    } = this.props;
    e.preventDefault();
    onNodeSelect(e, convertNodePropsToEventData(this.props));
  };

  onCheck = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    if (this.isDisabled()) return;

    const { disableCheckbox, checked } = this.props;
    const {
      context: { onNodeCheck },
    } = this.props;

    if (!this.isCheckable() || disableCheckbox) return;

    e.preventDefault();
    const targetChecked = !checked;
    onNodeCheck(e, convertNodePropsToEventData(this.props), targetChecked);
  };

  onMouseEnter = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    const {
      context: { onNodeMouseEnter },
    } = this.props;
    onNodeMouseEnter(e, convertNodePropsToEventData(this.props));
  };

  onMouseLeave = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    const {
      context: { onNodeMouseLeave },
    } = this.props;
    onNodeMouseLeave(e, convertNodePropsToEventData(this.props));
  };

  onContextMenu = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    const {
      context: { onNodeContextMenu },
    } = this.props;
    onNodeContextMenu(e, convertNodePropsToEventData(this.props));
  };

  onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const {
      context: { onNodeDragStart },
    } = this.props;

    e.stopPropagation();
    this.setState({
      dragNodeHighlight: true,
    });
    onNodeDragStart(e, this);

    try {
      // ie throw error
      // firefox-need-it
      e.dataTransfer.setData('text/plain', '');
    } catch (error) {
      // empty
    }
  };

  onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    const {
      context: { onNodeDragEnter },
    } = this.props;

    e.preventDefault();
    e.stopPropagation();
    onNodeDragEnter(e, this);
  };

  onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const {
      context: { onNodeDragOver },
    } = this.props;

    e.preventDefault();
    e.stopPropagation();
    onNodeDragOver(e, this);
  };

  onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const {
      context: { onNodeDragLeave },
    } = this.props;

    e.stopPropagation();
    onNodeDragLeave(e, this);
  };

  onDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    const {
      context: { onNodeDragEnd },
    } = this.props;

    e.stopPropagation();
    this.setState({
      dragNodeHighlight: false,
    });
    onNodeDragEnd(e, this);
  };

  onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const {
      context: { onNodeDrop },
    } = this.props;

    e.preventDefault();
    e.stopPropagation();
    this.setState({
      dragNodeHighlight: false,
    });
    onNodeDrop(e, this);
  };

  // Disabled item still can be switch
  onExpand: React.MouseEventHandler<HTMLDivElement> = e => {
    const {
      context: { onNodeExpand },
    } = this.props;
    onNodeExpand(e, convertNodePropsToEventData(this.props));
  };

  // Drag usage
  setSelectHandle = node => {
    this.selectHandle = node;
  };

  getNodeState = () => {
    const { expanded } = this.props;

    if (this.isLeaf()) {
      return null;
    }

    return expanded ? ICON_OPEN : ICON_CLOSE;
  };

  hasChildren = () => {
    const { eventKey } = this.props;
    const {
      context: { keyEntities },
    } = this.props;
    const { children } = keyEntities[eventKey] || {};

    return !!(children || []).length;
  };

  isLeaf = () => {
    const { isLeaf, loaded } = this.props;
    const {
      context: { loadData },
    } = this.props;

    const hasChildren = this.hasChildren();

    if (isLeaf === false) {
      return false;
    }

    return isLeaf || (!loadData && !hasChildren) || (loadData && loaded && !hasChildren);
  };

  isDisabled = () => {
    const { disabled } = this.props;
    const {
      context: { disabled: treeDisabled },
    } = this.props;

    return !!(treeDisabled || disabled);
  };

  isCheckable = () => {
    const { checkable } = this.props;
    const {
      context: { checkable: treeCheckable },
    } = this.props;

    // Return false if tree or treeNode is not checkable
    if (!treeCheckable || checkable === false) return false;
    return treeCheckable;
  };

  // Load data to avoid default expanded tree without data
  syncLoadData = props => {
    const { expanded, loading, loaded } = props;
    const {
      context: { loadData, onNodeLoad },
    } = this.props;

    if (loading) return;

    // read from state to avoid loadData at same time
    if (loadData && expanded && !this.isLeaf()) {
      // We needn't reload data when has children in sync logic
      // It's only needed in node expanded
      if (!this.hasChildren() && !loaded) {
        onNodeLoad(convertNodePropsToEventData(this.props));
      }
    }
  };

  isSelectable() {
    const { selectable } = this.props;
    const {
      context: { selectable: treeSelectable },
    } = this.props;

    // Ignore when selectable is undefined or null
    if (typeof selectable === 'boolean') {
      return selectable;
    }

    return treeSelectable;
  }

  // Switcher
  renderSwitcher = () => {
    const { expanded, switcherIcon: switcherIconFromProps } = this.props;
    const {
      context: { prefixCls, switcherIcon: switcherIconFromCtx },
    } = this.props;

    const switcherIcon = switcherIconFromProps || switcherIconFromCtx;

    if (this.isLeaf()) {
      return (
        <span className={classNames(`${prefixCls}-switcher`, `${prefixCls}-switcher-noop`)}>
          {typeof switcherIcon === 'function'
            ? switcherIcon({ ...this.props, isLeaf: true })
            : switcherIcon}
        </span>
      );
    }

    const switcherCls = classNames(
      `${prefixCls}-switcher`,
      `${prefixCls}-switcher_${expanded ? ICON_OPEN : ICON_CLOSE}`,
    );
    return (
      <span onClick={this.onExpand} className={switcherCls}>
        {typeof switcherIcon === 'function'
          ? switcherIcon({ ...this.props, isLeaf: false })
          : switcherIcon}
      </span>
    );
  };

  // Checkbox
  renderCheckbox = () => {
    const { checked, halfChecked, disableCheckbox } = this.props;
    const {
      context: { prefixCls },
    } = this.props;
    const disabled = this.isDisabled();
    const checkable = this.isCheckable();

    if (!checkable) return null;

    // [Legacy] Custom element should be separate with `checkable` in future
    const $custom = typeof checkable !== 'boolean' ? checkable : null;

    return (
      <span
        className={classNames(
          `${prefixCls}-checkbox`,
          checked && `${prefixCls}-checkbox-checked`,
          !checked && halfChecked && `${prefixCls}-checkbox-indeterminate`,
          (disabled || disableCheckbox) && `${prefixCls}-checkbox-disabled`,
        )}
        onClick={this.onCheck}
      >
        {$custom}
      </span>
    );
  };

  renderIcon = () => {
    const { loading } = this.props;
    const {
      context: { prefixCls },
    } = this.props;

    return (
      <span
        className={classNames(
          `${prefixCls}-iconEle`,
          `${prefixCls}-icon__${this.getNodeState() || 'docu'}`,
          loading && `${prefixCls}-icon_loading`,
        )}
      />
    );
  };

  // Icon + Title
  renderSelector = () => {
    const { dragNodeHighlight } = this.state;
    const { title, selected, icon, loading, data } = this.props;
    const {
      context: { prefixCls, showIcon, icon: treeIcon, draggable, loadData, titleRender },
    } = this.props;
    const disabled = this.isDisabled();

    const wrapClass = `${prefixCls}-node-content-wrapper`;

    // Icon - Still show loading icon when loading without showIcon
    let $icon;

    if (showIcon) {
      const currentIcon = icon || treeIcon;

      $icon = currentIcon ? (
        <span className={classNames(`${prefixCls}-iconEle`, `${prefixCls}-icon__customize`)}>
          {typeof currentIcon === 'function' ? currentIcon(this.props) : currentIcon}
        </span>
      ) : (
        this.renderIcon()
      );
    } else if (loadData && loading) {
      $icon = this.renderIcon();
    }

    // Title
    let titleNode: React.ReactNode;
    if (typeof title === 'function') {
      titleNode = title(data);
    } else if (titleRender) {
      titleNode = titleRender(data);
    } else {
      titleNode = title;
    }

    const $title = <span className={`${prefixCls}-title`}>{titleNode}</span>;

    return (
      <span
        ref={this.setSelectHandle}
        title={typeof title === 'string' ? title : ''}
        className={classNames(
          `${wrapClass}`,
          `${wrapClass}-${this.getNodeState() || 'normal'}`,
          !disabled && (selected || dragNodeHighlight) && `${prefixCls}-node-selected`,
          !disabled && draggable && 'draggable',
        )}
        draggable={(!disabled && draggable) || undefined}
        aria-grabbed={(!disabled && draggable) || undefined}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onContextMenu={this.onContextMenu}
        onClick={this.onSelectorClick}
        onDoubleClick={this.onSelectorDoubleClick}
        onDragStart={draggable ? this.onDragStart : undefined}
      >
        {$icon}
        {$title}
        {this.renderDragIndicator()}
      </span>
    );
  };

  renderDragIndicator = () => {
    const { disabled, dragOver, dragOverGapTop, dragOverGapBottom } = this.props;
    const {
      context: { draggable, elevatedDropLevel, prefixCls, dropContainerKey, dropPosition, indent },
      eventKey
    } = this.props;
    // const isDropNodeContainer = (dropContainerKey === eventKey) && dropPosition !== 0
    const showIndicator =
      !disabled && draggable && (dragOver || dragOverGapBottom || dragOverGapTop);
    const positionStyle: React.CSSProperties = {
      position: 'absolute',
    };
    if (dragOverGapTop) {
      positionStyle.top = 0;
      positionStyle.height = 2;
      positionStyle.right = 0;
      positionStyle.backgroundColor = 'red';
      positionStyle.left = -elevatedDropLevel * indent;
    } else if (dragOverGapBottom) {
      positionStyle.bottom = 0;
      positionStyle.height = 2;
      positionStyle.right = 0;
      positionStyle.backgroundColor = 'red';
      positionStyle.left = -elevatedDropLevel * indent;
    } else {
      positionStyle.bottom = 0;
      positionStyle.height = 2;
      positionStyle.right = 0;
      positionStyle.backgroundColor = 'red';
      positionStyle.left = indent;
    }
    return showIndicator ? (
      <div
        className={`${prefixCls}-drag-indicator`}
        style={{
          ...positionStyle,
        }}
      />
    ) : null;
  };

  render() {
    const {
      eventKey,
      className,
      style,
      dragOver,
      dragOverGapTop,
      dragOverGapBottom,
      isLeaf,
      isStart,
      isEnd,
      expanded,
      selected,
      checked,
      halfChecked,
      loading,
      domRef,
      active,
      onMouseMove,
      ...otherProps
    } = this.props;
    const {
      context: { prefixCls, filterTreeNode, draggable, keyEntities, indent },
    } = this.props;
    const disabled = this.isDisabled();
    const dataOrAriaAttributeProps = getDataAndAria(otherProps);
    const { level } = keyEntities[eventKey] || {};
    const isEndNode = isEnd[isEnd.length - 1];
    return (
      <div
        ref={domRef}
        className={classNames(className, `${prefixCls}-treenode`, {
          [`${prefixCls}-treenode-disabled`]: disabled,
          [`${prefixCls}-treenode-switcher-${expanded ? 'open' : 'close'}`]: !isLeaf,
          [`${prefixCls}-treenode-checkbox-checked`]: checked,
          [`${prefixCls}-treenode-checkbox-indeterminate`]: halfChecked,
          [`${prefixCls}-treenode-selected`]: selected,
          [`${prefixCls}-treenode-loading`]: loading,
          [`${prefixCls}-treenode-active`]: active,
          [`${prefixCls}-treenode-leaf-last`]: isEndNode,

          'drag-over': !disabled && dragOver,
          'drag-over-gap-top': !disabled && dragOverGapTop,
          'drag-over-gap-bottom': !disabled && dragOverGapBottom,
          'filter-node': filterTreeNode && filterTreeNode(convertNodePropsToEventData(this.props)),
        })}
        style={style}
        onDragEnter={draggable ? this.onDragEnter : undefined}
        onDragOver={draggable ? this.onDragOver : undefined}
        onDragLeave={draggable ? this.onDragLeave : undefined}
        onDrop={draggable ? this.onDrop : undefined}
        onDragEnd={draggable ? this.onDragEnd : undefined}
        onMouseMove={onMouseMove}
        {...dataOrAriaAttributeProps}
      >
        <Indent prefixCls={prefixCls} level={level} isStart={isStart} isEnd={isEnd} width={indent}/>
        {this.renderSwitcher()}
        {this.renderCheckbox()}
        {this.renderSelector()}
      </div>
    );
  }
}

const ContextTreeNode: React.FC<TreeNodeProps> = props => (
  <TreeContext.Consumer>
    {context => <InternalTreeNode {...props} context={context} />}
  </TreeContext.Consumer>
);

ContextTreeNode.displayName = 'TreeNode';

ContextTreeNode.defaultProps = {
  title: defaultTitle,
};

(ContextTreeNode as any).isTreeNode = 1;

export { InternalTreeNode };

export default ContextTreeNode;
