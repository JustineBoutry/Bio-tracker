import Experiments from './pages/Experiments';
import ExperimentSetup from './pages/ExperimentSetup';
import DataEntry from './pages/DataEntry';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Experiments": Experiments,
    "ExperimentSetup": ExperimentSetup,
    "DataEntry": DataEntry,
}

export const pagesConfig = {
    mainPage: "Experiments",
    Pages: PAGES,
    Layout: __Layout,
};