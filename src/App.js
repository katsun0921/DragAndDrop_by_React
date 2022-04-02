import axios from 'axios';
import React, { Fragment, useEffect, useState, useRef } from 'react';
import logo from './logo.svg';
import './App.css';


const baseURL = new URL('https://api.ks-portfolio.site/skills');

/**
 * @description apiからデータを取得
 * @return {Promise<{Object}>}
 */
const apiGet = async () => await axios.get(baseURL);

/**
 * @description マウスポインターが要素と被っているか判定します
 * @param {MouseEvent} event
 * @param {HTMLElement} element
 * @return {boolean}
 */
const isHover = (event, element) => {
  // マウスポインターの座標を取得
  const clientX = event.clientX;
  const clientY = event.clientY;

  // 重なりを判定する要素のサイズと座標を取得
  const rect = element.getBoundingClientRect();

  // マウスポインターが要素と重なっているかを判定する
  return clientY < rect.bottom && clientY > rect.top && clientX < rect.right && clientX > rect.left;
};

function App() {
  const [blocks, setBlocks] = useState([]);

  // 状態をrefで管理する
  const state = useRef({
    dndItems: [],
    keys: new Map(),
    dragElement: null,
    canCheckHovered: true,
    pointerPosition: { x: 0, y: 0 },
    sortIds: [],
  }).current;


  const sortBlocks = (sortItems) => {
    const canCheckTime = 300;

    /**
     * @description ドラッグ中の処理
     * @param {MouseEvent} event
     * @returns
     */
    const onMouseMove = (event) => {
      const { clientX, clientY } = event;
      const { dndItems, dragElement, pointerPosition } = state;

      // ドラッグして無ければ何もしない
      if (!dragElement) return;

      // マウスポインターの移動量を計算
      const x = clientX - pointerPosition.x;
      const y = clientY - pointerPosition.y;

      // ドラッグ要素の座標とスタイルを更新
      const dragStyle = dragElement.element.style;
      dragStyle.zIndex = '100';
      dragStyle.cursor = 'grabbing';
      dragStyle.transform = `translate(${x}px,${y}px)`;

      // まだ確認できない場合は処理を終了する
      if (!state.canCheckHovered) return;

      // 確認できないようにする
      state.canCheckHovered = false;

      // ${canCheckTime}ms後に確認できるようにする
      setTimeout(() => state.canCheckHovered = true, canCheckTime);

      // ドラッグしている要素の配列の位置を取得
      const dragIndex = dndItems.findIndex(({ key }) => key === dragElement.key);

      // ホバーされている要素の配列の位置を取得
      const hoveredIndex = dndItems.findIndex(({ element }, index) => index !== dragIndex && isHover(event, element));

      // ホバーされている要素があれば、ドラッグしている要素と入れ替える
      if (hoveredIndex !== -1) {
        // カーソルの位置を更新
        state.pointerPosition.x = clientX;
        state.pointerPosition.y = clientY;

        // 要素を入れ替える
        dndItems.splice(dragIndex, 1);
        dndItems.splice(hoveredIndex, 0, dragElement);

        const { left: x, top: y } = dragElement.element.getBoundingClientRect();

        // ドラッグ要素の座標を更新
        dragElement.position = { x, y };

        // 再描画する
        setBlocks(dndItems.map((item) => item.value));
      }
    };

    /**
     * @description ドラッグが終了した時の処理
     * @return {void}
     */
    const onMouseUp = () => {
      const { dragElement } = state;

      // ドラッグしていなかったら何もしない
      if (!dragElement) return;

      const dragStyle = dragElement.element.style;

      // ドラッグしてる要素に適用していたCSSを削除
      dragStyle.zIndex = '';
      dragStyle.cursor = '';
      dragStyle.transform = '';

      // ドラッグしている要素をstateから削除
      state.dragElement = null;

      // windowに登録していたイベントを削除
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };

    return sortItems.map((value) => {
      // keyが無ければ新しく作り、あれば既存のkey文字列を返す
      const key = state.keys.get(`item_${value.blockId}`) || Math.random().toString(16);

      // 生成したkey文字列を保存
      state.keys.set(`item_${value.blockId}`, key);

      if (!state.sortIds.includes(value.blockId)) {
        state.sortIds.push(value.blockId);
      }

      return {
        value,

        key,

        events: {
          ref: (element) => {
            const { dndItems, dragElement, pointerPosition, sortIds } = state;

            if (!element || !dragElement) return;

            const block = element.closest('.block');

            // 位置をリセットする
            block.style.transform = '';

            // 要素の位置を取得
            const { left: x, top: y } = block.getBoundingClientRect();
            const position = { x, y };

            console.log('key', key);
            const itemIndex = dndItems.findIndex((item) => item.key === key);

            // 要素が無ければ新しく追加して処理を終わる
            if (itemIndex === -1 && sortIds.length > dndItems.length) {
              return dndItems.push({ key, value, element: block, position });
            }

            // ドラッグ要素の時は、ズレを修正する
            if (dragElement.key === key) {
              // ドラッグ要素のズレを計算する
              const dragX = dragElement.position.x - position.x;
              const dragY = dragElement.position.y - position.y;

              // 入れ替え時のズレを無くす
              block.style.transform = `translate(${dragX}px,${dragY}px)`;

              // マウスポインターの位置も再計算してズレを無くす
              pointerPosition.x -= dragX;
              pointerPosition.y -= dragY;
            }

            // ドラッグ要素以外の要素をアニメーションさせながら移動させる
            if (dragElement.key !== key) {
              const item = dndItems[itemIndex];

              // 前回の座標を計算
              const x = item.position.x - position.x;
              const y = item.position.y - position.y;

              // 要素を前回の位置に留めておく
              block.style.transition = '';
              block.style.transform = `translate(${x}px,${y}px)`;

              // 1フレーム後に要素をアニメーションさせながら元に位置に戻す
              requestAnimationFrame(() => {
                block.style.transform = '';
                block.style.transition = `all ${canCheckTime}ms`;
              });
            }

            // 要素を更新する
            state.dndItems[itemIndex] = { key, value, element: block, position };
          },

          /**
           * @description ドラッグ開始の処理
           * @param {React.MouseEvent<HTMLElement>} event
           * @return {void}
           */
          onMouseDown: (event) => {

            // ドラッグする要素(DOM)
            const element = event.currentTarget.closest('.block');

            // マウスポインターの座標を保持しておく
            state.pointerPosition.x = event.clientX;
            state.pointerPosition.y = event.clientY;

            // ドラッグしている要素のスタイルを上書き
            element.style.transition = ''; // アニメーションを無効にする
            element.style.cursor = 'grabbing'; // カーソルのデザインを変更

            // 要素の座標を取得
            const { left: x, top: y } = element.getBoundingClientRect();
            const position = { x, y };

            // ドラッグする要素を保持しておく
            state.dragElement = { key, value, element, position };

            // mousedownイベントで変化したuseStateをstateに反映
            state.dndItems.forEach((item, i) => {
              item.value = blocks[i];
            });

            // mousemove, mouseupイベントをwindowに登録する
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('mousemove', onMouseMove);
          },
        },
      };
    });
  };

  useEffect(() => {
    async function fetchData() {
      const response = await apiGet();
      setBlocks(response.data[0].programming);
    }
    fetchData();
  }, []);

  return (
    <ul className="App">
      {blocks.map((block,i) => (

        <li key={i} className="block">
          <div className="panel-body" {...block.events}>
            {block.language}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default App;
