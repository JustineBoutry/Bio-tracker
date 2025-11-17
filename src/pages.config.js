import Experiments from './pages/Experiments';
import ExperimentSetup from './pages/ExperimentSetup';
import DataEntry from './pages/DataEntry';
import Dataset from './pages/Dataset';
import IndividualHistory from './pages/IndividualHistory';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Experiments": Experiments,
    "ExperimentSetup": ExperimentSetup,
    "DataEntry": DataEntry,
    "Dataset": Dataset,
    "IndividualHistory": IndividualHistory,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Experiments",
    Pages: PAGES,
    Layout: __Layout,
};