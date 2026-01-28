<?php

namespace App\Presentation\Controllers;

use App\Domain\Repositories\MessageRepositoryInterface;
use App\Domain\Entities\Message;

class MessageController
{
    use JsonResponseTrait;

    public function __construct(
        private MessageRepositoryInterface $messageRepository
    ) {}

    public function index(): void
    {
        $page = (int)($_GET['page'] ?? 1);
        $perPage = (int)($_GET['per_page'] ?? 20);

        try {
            $result = $this->messageRepository->findAll($page, $perPage);
            $this->jsonResponse($result);
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'MESSAGE_ERROR', 500);
        }
    }

    public function store(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['name']) || empty($data['email']) || empty($data['message'])) {
                $this->errorResponse('Name, email, and message are required', 'VALIDATION_ERROR', 400);
                return;
            }
            
            $message = Message::create(
                $data['name'],
                $data['email'],
                $data['subject'] ?? 'Contact Form Submission',
                $data['message']
            );
            
            $saved = $this->messageRepository->save($message);
            
            $this->jsonResponse([
                'message' => 'Message sent successfully. We will get back to you soon.',
                'id' => $saved->getId()
            ], 201);
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'MESSAGE_SEND_ERROR', 400);
        }
    }
}
