import { useParams } from "next/navigation";

export const useJournalId = () => {
    const params = useParams();
    return params.id as string;
}
