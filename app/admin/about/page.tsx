"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { AlertBanner } from "@/components/ui/alert-banner"

import { useGetAboutContent, useUpdateAboutContent, aboutContentSchema, type AboutContent } from "@/src/features/about"

export default function AdminAboutPage() {
  const { data: initialData, isLoading, error: loadError } = useGetAboutContent()
  const updateMutation = useUpdateAboutContent()

  const form = useForm<AboutContent>({
    resolver: zodResolver(aboutContentSchema),
    defaultValues: {
      heroTitle: "",
      heroSubtitle: "",
      missionText: "",
      visionText: "",
      whoWeAreText: "",
      brandPhilosophyText: "",
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset(initialData)
    }
  }, [initialData, form])

  const onSubmit = (values: AboutContent) => {
    updateMutation.mutate(values)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">About Page Content</h1>
        <p className="text-muted-foreground">
          Manage the content displayed on the public About page.
        </p>
      </div>

      {loadError && (
        <AlertBanner variant="error" message="Failed to load about page content." />
      )}

      {updateMutation.isError && (
        <AlertBanner variant="error" message="Failed to save about page content." />
      )}

      {updateMutation.isSuccess && (
        <AlertBanner variant="success" message="About page content updated successfully." />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>Main heading and subtitle at the top of the page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="heroTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="About dis" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heroSubtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Redefining the future..." 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mission & Vision</CardTitle>
              <CardDescription>Core mission and vision statements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="missionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mission Text</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visionText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vision Text</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Who We Are & Brand Philosophy</CardTitle>
              <CardDescription>Detailed descriptive content paragraphs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="whoWeAreText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Who We Are Text</FormLabel>
                    <FormDescription>Use double line breaks for new paragraphs.</FormDescription>
                    <FormControl>
                      <Textarea 
                        className="min-h-[200px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brandPhilosophyText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Philosophy Text</FormLabel>
                    <FormDescription>Use double line breaks for new paragraphs.</FormDescription>
                    <FormControl>
                      <Textarea 
                        className="min-h-[150px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
