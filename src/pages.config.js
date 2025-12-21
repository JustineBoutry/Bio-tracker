import CleanupData from './pages/CleanupData';
import Dashboard from './pages/Dashboard';
import DataEntry from './pages/DataEntry';
import Dataset from './pages/Dataset';
import ExperimentSetup from './pages/ExperimentSetup';
import Home from './pages/Home';
import IndividualHistory from './pages/IndividualHistory';
import LabNotebook from './pages/LabNotebook';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CleanupData": CleanupData,
    "Dashboard": Dashboard,
    "DataEntry": DataEntry,
    "Dataset": Dataset,
    "ExperimentSetup": ExperimentSetup,
    "Home": Home,
    "IndividualHistory": IndividualHistory,
    "LabNotebook": LabNotebook,
}

export const pagesConfig = {
    mainPage: "ExperimentSetup",
    Pages: PAGES,
    Layout: __Layout,
};