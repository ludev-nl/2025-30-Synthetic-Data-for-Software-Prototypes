import React, { useState, useEffect } from "react";
import { Package, Trash } from "lucide-react";
import { useParams } from "react-router";
import { useSystemPrototypes } from "$lib/features/prototypes/queries";
import { deletePrototype, deleteSystemPrototypes } from "$lib/features/prototypes/mutations";
import { Button, Modal, ModalDialog, ModalClose, Divider, CircularProgress } from '@mui/joy';
import { authAxios } from "$lib/features/auth/state/auth";


type Props = {
    system: string;
};

export const ShowPrototypes: React.FC<Props> = ({ system }) => {
    const { systemId } = useParams();
    const [data, isSuccess] = useSystemPrototypes(systemId);
    const [prototypeStatuses, setPrototypeStatuses] = useState<{ [key: string]: string }>({});
    const [prototypeUrls, setPrototypeUrls] = useState<{ [key: string]: string }>({});
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        if (isSuccess && data) {
            data.forEach((prototype, index) => {
                const fetchStatus = async () => {
                    const response = await authAxios.get(`/v1/generator/prototypes/status/${prototype.name}`);
                    const status = response.data.running;
                    const url = response.data.ip + ":" + response.data.port;
                    if (status === true) {
                        setPrototypeStatuses((prev) => ({
                            ...prev,
                            [prototype.name]: "Running",
                        }));
                        setPrototypeUrls((prev) => ({
                            ...prev,
                            [prototype.name]: url,
                        }));
                    }
                    else {
                        setPrototypeStatuses((prev) => ({
                            ...prev,
                            [prototype.name]: "Not running",
                        }));
                        setPrototypeUrls((prev) => ({
                            ...prev,
                            [prototype.name]: "",
                        }));
                    }
                };
    
                const timeoutId = setTimeout(() => {
                    fetchStatus();
                    const intervalId = setInterval(fetchStatus, 10000);
                    return () => clearInterval(intervalId);
                }, index * 10000);    
                return () => clearTimeout(timeoutId);
            });
        }
    }, [isSuccess, data]);

    const handleDelete = async (prototypeId: string) => {
        try {
            await deletePrototype(prototypeId);
            window.location.reload();
        } catch (error) {
            console.error('Error deleting prototype:', error);
        }
    };

    const handleDeleteAll = async () => {
        try {
            await deleteSystemPrototypes(systemId);
            window.location.reload();
        } catch (error) {
            console.error('Error deleting prototypes:', error);
        }
    };

    const openModal = () => {
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const proceedDeleteAll = async () => {
        closeModal();
        await handleDeleteAll();
    };

    const handleRun = async (prototypeName: string) => {
        setLoading((prev) => ({ ...prev, [prototypeName]: true }));
        try {
            await authAxios.post(`/v1/generator/prototypes/run/${prototypeName}`);
        } catch (error) {
            console.error('Error making run request:', error);
        } finally {
            setTimeout(() => {
                setLoading((prev) => ({ ...prev, [prototypeName]: false }));
            }, 6000);
        }
    };
    
    const handleStop = async (prototypeName: string) => {
        setLoading((prev) => ({ ...prev, [prototypeName]: true }));
        try {
            await authAxios.post(`/v1/generator/prototypes/stop/${prototypeName}`);
        } catch (error) {
            console.error('Error making stop request:', error);
        } finally {
            setTimeout(() => {
                setLoading((prev) => ({ ...prev, [prototypeName]: false }));
            }, 6000);
        }
    };
    

    return (
        <>
            <table className="min-w-full bg-white text-left">
                <thead className="text-sm w-full">
                    <tr>
                        <th className="py-2 px-4 text-left border-b border-stone-200 w-30">
                            <span className="flex flex-row items-center gap-2">
                                <Package size={24} />
                                <h1 className="text-lg">Prototypes</h1>
                            </span>
                        </th>
                        <th className="py-2 px-4 text-left border-b border-stone-200 w-52">Status</th>
                        <th className="py-2 px-4 text-left border-b border-stone-200 w-52">URL</th>
                        <th className="py-2 px-4 text-left border-b border-stone-200 w-40">
                            <Button
                                onClick={openModal}
                                color="danger"
                                variant="solid"
                                className="w-[110px] h-[40px]"
                            >
                                <h2 className="text-base">Delete all</h2>
                            </Button>
                        </th>
                    </tr>
                </thead>
                {isSuccess && (
                    <tbody className="max-h-96 overflow-y-auto">
                        {[...data].reverse().map((e, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="py-2 px-4 text-left border-b border-gray-200">
                                    <h1 className="text-lg">{e.name}</h1>
                                    <h2 className="text-stone-400">{e.description}</h2>
                                </td>
                                <td className="py-2 px-4 text-left border-b border-gray-200">
                                    {prototypeStatuses[e.name] || (
                                        <CircularProgress className="animate-spin" />
                                    )}
                                </td>
                                <td className="py-2 px-4 text-left border-b border-gray-200">
                                    <a href={"http://" + prototypeUrls[e.name]} target="_blank" className="text-blue-500 hover:underline">
                                        {prototypeUrls[e.name]}
                                    </a>
                                </td>
                                <td className="py-2 px-4 text-left border-b border-gray-200 w-40 flex space-x-2">
                                    { prototypeStatuses[e.name] === "Running" && (
                                        <button
                                            onClick={() => handleStop(e.name)}
                                            disabled={loading[e.name]}
                                            className={`w-[60px] h-[40px] rounded-md ${
                                                loading[e.name] ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                                            } text-white`}
                                        >
                                            Kill
                                        </button>
                                    )}
                                    { prototypeStatuses[e.name] === "Not running" && (
                                        <button
                                            onClick={() => handleRun(e.name)}
                                            disabled={loading[e.name]}
                                            className={`w-[60px] h-[40px] rounded-md ${
                                                loading[e.name] ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                                            } text-white`}
                                        >
                                            Run
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(e.id)}
                                        className="w-[40px] h-[40px] bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center"
                                    >
                                        <Trash />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                )}
            </table>

            <Modal
                open={showModal}
                onClose={closeModal}
            >
                <ModalDialog>
                    <div className="flex w-full flex-row justify-between pb-1">
                        <div className="flex flex-col">
                            <h1 className="font-bold">Confirm</h1>
                            <h3 className="text-sm">Are you sure you want to delete all prototypes in this system?</h3>
                        </div>
                        <ModalClose
                            sx={{
                                position: "relative",
                                top: 0,
                                right: 0,
                            }}
                        />
                    </div>
                    <Divider />
                    <div className="flex flex-row pt-1 gap-4">
                        <Button onClick={closeModal} variant="outlined" color="neutral">
                            Cancel
                        </Button>
                        <Button onClick={proceedDeleteAll} variant="solid" color="danger">
                            Confirm
                        </Button>
                    </div>
                </ModalDialog>
            </Modal>
        </>
    );
};

export default ShowPrototypes;
