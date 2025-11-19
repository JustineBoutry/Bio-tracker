import ExperimentSetup from './pages/ExperimentSetup';
import DataEntry from './pages/DataEntry';
import Dataset from './pages/Dataset';
import IndividualHistory from './pages/IndividualHistory';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ExperimentSetup": ExperimentSetup,
    "DataEntry": DataEntry,
    "Dataset": Dataset,
    "IndividualHistory": IndividualHistory,
    "Dashboard": Dashboard,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "ExperimentSetup",
    Pages: PAGES,
    Layout: __Layout,
};