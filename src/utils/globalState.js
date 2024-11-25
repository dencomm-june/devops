// utils/globalState.js
if (!global.isRunning) {
    global.isRunning = false;
}

const getIsRunning = () => global.isRunning;
const setIsRunning = (value) => {
    global.isRunning = value;
};

module.exports = { getIsRunning, setIsRunning };