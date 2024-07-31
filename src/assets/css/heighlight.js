// highlight.js import Hljs from 'highlight.js' // 这里引入css import
'highlight.js/styles/github.css'
let HighLight = {}; HighLight.install =
    function (Vue) {
        Vue.directive('highlight', function (el) {
            let blocks =
                el.querySelectorAll('pre code'); blocks.forEach((block) => {
                    Hljs.highlightBlock(block)
                })
        });
    }

export default HighLight;