<?php

namespace App\Presentation\Controllers;

use App\Domain\Repositories\FAQRepositoryInterface;
use App\Domain\Entities\FAQ;

class FAQController
{
    use JsonResponseTrait;

    public function __construct(
        private FAQRepositoryInterface $faqRepository
    ) {}

    public function index(): void
    {
        $page = (int)($_GET['page'] ?? 1);
        $perPage = (int)($_GET['per_page'] ?? 20);
        $publishedOnly = isset($_GET['published']) ? (bool)$_GET['published'] : true;

        try {
            $result = $this->faqRepository->findAll($page, $perPage, $publishedOnly);
            $this->jsonResponse($result);
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'FAQ_ERROR', 500);
        }
    }

    public function show(): void
    {
        $id = (int)($_GET['id'] ?? 0);
        
        try {
            $faq = $this->faqRepository->findById($id);
            
            if (!$faq) {
                $this->errorResponse('FAQ not found', 'NOT_FOUND', 404);
                return;
            }
            
            $this->jsonResponse($faq->toArray());
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'FAQ_ERROR', 500);
        }
    }

    public function store(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $faq = FAQ::create(
                $data['question'] ?? '',
                $data['answer'] ??'',
                $data['category'] ?? null,
                (int)($data['priority'] ?? 0),
                (bool)($data['is_published'] ?? true)
            );
            
            $saved = $this->faqRepository->save($faq);
            
            $this->jsonResponse($saved->toArray(), 201);
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'FAQ_CREATE_ERROR', 400);
        }
    }

    public function update(): void
    {
        try {
            $id = (int)($_GET['id'] ?? 0);
            $data = json_decode(file_get_contents('php://input'), true);
            
            $faq = $this->faqRepository->findById($id);
            if (!$faq) {
                $this->errorResponse('FAQ not found', 'NOT_FOUND', 404);
                return;
            }
            
            $faq->update(
                $data['question'] ?? $faq->getQuestion(),
                $data['answer'] ?? $faq->getAnswer(),
                $data['category'] ?? $faq->getCategory(),
                (int)($data['priority'] ?? $faq->getPriority()),
                (bool)($data['is_published'] ?? $faq->isPublished())
            );
            
            $saved = $this->faqRepository->save($faq);
            
            $this->jsonResponse($saved->toArray());
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'FAQ_UPDATE_ERROR', 400);
        }
    }

    public function delete(): void
    {
        try {
            $id = (int)($_GET['id'] ?? 0);
            
            $deleted = $this->faqRepository->delete($id);
            
            if ($deleted) {
                $this->jsonResponse(['message' => 'FAQ deleted successfully']);
            } else {
                $this->errorResponse('FAQ not found', 'NOT_FOUND', 404);
            }
        } catch (\Exception $e) {
            $this->errorResponse($e->getMessage(), 'FAQ_DELETE_ERROR', 500);
        }
    }
}
